import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { Prisma } from "@prisma/client";
import { recordExternalAction } from "./audit";
import { AGENT_PLAN_STEPS } from "./catalog";
import { redactSecrets } from "./redact";

export async function listAgentRunsForActor(actor: Actor) {
  return prisma.agentRun.findMany({
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
  return run;
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

  const run = await prisma.agentRun.create({
    data: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      campaignId: input.campaignId ?? null,
      goal,
      status: "WAITING_APPROVAL",
      result: redactSecrets({
        phase: "PLAN",
        message:
          "Plan created. External publish/send is blocked until approval and provider implementation.",
      }) as Prisma.InputJsonValue,
      steps: {
        create: AGENT_PLAN_STEPS.map((name, ordinal) => ({
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          ordinal,
          name,
          status:
            ordinal <= 4
              ? ("COMPLETED" as const)
              : ordinal === 5
                ? ("WAITING_APPROVAL" as const)
                : ("PENDING" as const),
          output:
            ordinal <= 4
              ? (redactSecrets({
                  status: "planned",
                  note: "Prepared locally. No external API was called.",
                }) as Prisma.InputJsonValue)
              : undefined,
        })),
      },
    },
    include: { steps: { orderBy: { ordinal: "asc" } } },
  });

  await recordExternalAction({
    actor,
    action: "agent_run_create",
    status: "approval_required",
    agentRunId: run.id,
    metadata: { goalLength: goal.length },
  });
  return run;
}
