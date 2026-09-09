import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { Prisma } from "@prisma/client";
import { recordExternalAction } from "./audit";
import { resolveAgentIntentResults, type IntegrationCapabilitySnapshot } from "./agent-intent";
import {
  applyPlanApproval,
  applyPlanRejection,
  buildAgentRunPlan,
  planApprovalBlockReason,
} from "./agent-run-plan";
import { getAgentPolicyForActor } from "./policy";
import { listIntegrationsForActor } from "./integrations";
import { redactSecrets } from "./redact";

function publicRun<T>(value: T): T {
  return redactSecrets(value);
}

function redactStoredRun<T extends {
  result: unknown;
  error?: string | null;
  steps: readonly { output: unknown }[];
}>(run: T): T {
  return {
    ...run,
    result: publicRun(run.result),
    error: run.error,
    steps: run.steps.map((step) => ({
      ...step,
      output: publicRun(step.output),
    })),
  };
}

export async function listAgentRunsForActor(actor: Actor) {
  const rows = await prisma.agentRun.findMany({
    where: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      steps: { orderBy: { ordinal: "asc" } },
    },
  });
  return rows.map((row) => redactStoredRun(row));
}

export async function getAgentRunForActor(actor: Actor, runId: string) {
  const run = await prisma.agentRun.findFirst({
    where: {
      id: runId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    include: { steps: { orderBy: { ordinal: "asc" } } },
  });
  if (!run) {
    throw new PersistenceError("not_found", "Agent run not found");
  }
  return redactStoredRun(run);
}

async function snapshotsForActor(
  actor: Actor,
): Promise<IntegrationCapabilitySnapshot[]> {
  const integrations = await listIntegrationsForActor(actor);
  return integrations.map((item) => ({
    provider: item.provider,
    label: item.label,
    implementationStatus: item.implementationStatus,
    connected: item.connected,
    canRead: item.permissions.canRead,
    canCreateDraft: item.permissions.canCreateDraft,
    canPublish: item.permissions.canPublish,
    canSendEmail: item.permissions.canSendEmail,
  }));
}

export async function createPlanRunForActor(
  actor: Actor,
  input: { readonly goal: string; readonly campaignId?: string | null },
) {
  const goal = input.goal.trim();
  if (!goal) {
    throw new PersistenceError("validation", "goal is required");
  }
  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: input.campaignId,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
      },
      select: { id: true },
    });
    if (!campaign) {
      throw new PersistenceError("not_found", "Campaign not found");
    }
  }

  const policy = await getAgentPolicyForActor(actor);
  const capabilities = resolveAgentIntentResults({
    goal,
    integrations: await snapshotsForActor(actor),
  });
  const plan = buildAgentRunPlan({
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
    policyMode: policy.mode,
    capabilities,
  });

  const run = await prisma.agentRun.create({
    data: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      campaignId: input.campaignId ?? null,
      goal,
      status: plan.runStatus,
      completedAt: plan.runStatus === "COMPLETED" ? new Date() : null,
      result: publicRun(plan.result) as Prisma.InputJsonValue,
      steps: {
        create: plan.steps.map((step, ordinal) => ({
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          ordinal,
          name: step.name,
          status: step.status,
          output: publicRun(step.output) as Prisma.InputJsonValue,
        })),
      },
    },
    include: { steps: { orderBy: { ordinal: "asc" } } },
  });

  await recordExternalAction({
    actor,
    action: "agent_run_create",
    status: plan.runStatus === "COMPLETED" ? "completed" : "approval_required",
    agentRunId: run.id,
    metadata: {
      goalLength: goal.length,
      understood: capabilities.map((item) => item.kind),
      unsupportedOnly: plan.runStatus === "COMPLETED",
    },
  });
  return redactStoredRun(run);
}

export async function approveAgentRunForActor(actor: Actor, runId: string) {
  const run = await prisma.agentRun.findFirst({
    where: {
      id: runId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    include: { steps: { orderBy: { ordinal: "asc" } } },
  });
  if (!run) {
    throw new PersistenceError("not_found", "Agent run not found");
  }
  const blocked = planApprovalBlockReason(run.status);
  if (blocked) {
    throw new PersistenceError("conflict", blocked);
  }

  const currentResult =
    run.result && typeof run.result === "object" && !Array.isArray(run.result)
      ? (run.result as Record<string, unknown>)
      : {};
  const nextResult = publicRun(applyPlanApproval(currentResult));

  await prisma.$transaction([
    prisma.agentRun.updateMany({
      where: {
        id: run.id,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        status: "WAITING_APPROVAL",
      },
      data: {
        status: "RUNNING",
        result: nextResult as Prisma.InputJsonValue,
        error: null,
      },
    }),
    prisma.agentRunStep.updateMany({
      where: {
        agentRunId: run.id,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        name: "wait_for_approval",
      },
      data: {
        status: "COMPLETED",
        output: publicRun({
          status: "approved",
          providerExecution: "not_started",
          note: "Plan approved. Nothing was published or sent.",
        }) as Prisma.InputJsonValue,
      },
    }),
    prisma.agentRunStep.updateMany({
      where: {
        agentRunId: run.id,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        name: { in: ["analyze_business_context", "analyze_connected_channels"] },
      },
      data: { status: "COMPLETED" },
    }),
  ]);

  await recordExternalAction({
    actor,
    action: "agent_run_approve",
    status: "completed",
    agentRunId: run.id,
    metadata: { providerExecution: "not_started" },
  });
  return getAgentRunForActor(actor, run.id);
}

export async function rejectAgentRunForActor(actor: Actor, runId: string) {
  const run = await prisma.agentRun.findFirst({
    where: {
      id: runId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    include: { steps: { orderBy: { ordinal: "asc" } } },
  });
  if (!run) {
    throw new PersistenceError("not_found", "Agent run not found");
  }
  if (run.status !== "WAITING_APPROVAL") {
    throw new PersistenceError(
      "conflict",
      "This plan cannot be rejected in its current status.",
    );
  }

  const currentResult =
    run.result && typeof run.result === "object" && !Array.isArray(run.result)
      ? (run.result as Record<string, unknown>)
      : {};
  const nextResult = publicRun(applyPlanRejection(currentResult));

  await prisma.$transaction([
    prisma.agentRun.updateMany({
      where: {
        id: run.id,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        status: "WAITING_APPROVAL",
      },
      data: {
        status: "CANCELLED",
        result: nextResult as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    }),
    prisma.agentRunStep.updateMany({
      where: {
        agentRunId: run.id,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        name: "wait_for_approval",
      },
      data: {
        status: "CANCELLED",
        output: publicRun({
          status: "rejected",
          note: "Plan rejected. Nothing was published or sent.",
        }) as Prisma.InputJsonValue,
      },
    }),
  ]);

  await recordExternalAction({
    actor,
    action: "agent_run_reject",
    status: "cancelled",
    agentRunId: run.id,
  });
  return getAgentRunForActor(actor, run.id);
}
