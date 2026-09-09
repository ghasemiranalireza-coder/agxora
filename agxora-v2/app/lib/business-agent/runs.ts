import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { Prisma } from "@prisma/client";
import { recordExternalAction } from "./audit";
import { AGENT_PLAN_STEPS } from "./catalog";
import { GMAIL_CHAT_GUIDANCE } from "./gmail-tools";
import { AMAZON_CHAT_GUIDANCE } from "./amazon-tools";
import { resolveAmazonCapabilityForActor } from "./capabilities";
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

  const emailIntent = /(email|gmail|inbox|reply|mailbox)/i.test(goal);
  const amazonIntent =
    /(amazon|sp-api|listing|lagerbestand|فروش آمازون|محصولات آمازون)/i.test(goal);
  const amazonCapability = amazonIntent
    ? await resolveAmazonCapabilityForActor(actor)
    : null;
  const amazonMessage = amazonCapability
    ? amazonCapability.canAnalyze
      ? "Amazon Seller is connected and allowed for this workspace. AGXORA can analyze the seller account after Amazon confirms the data. Price and inventory changes stay unavailable."
      : amazonCapability.missingSteps[0]?.message ??
        "Amazon Seller is not ready yet."
    : undefined;
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
        message: amazonMessage
          ? amazonMessage
          : emailIntent
            ? "Email plan created. Gmail read and draft can run when connected and permitted. Sending stays blocked until approval, send permission, and Gmail confirmation."
            : "Plan created. External publish/send is blocked until approval and provider implementation.",
        gmail: emailIntent
          ? {
              tools: [
                "gmail.list_messages",
                "gmail.get_message",
                "gmail.create_draft",
              ],
              sendBlockedUntilApproval: true,
              guidance: GMAIL_CHAT_GUIDANCE,
            }
          : undefined,
        amazon: amazonCapability
          ? {
              tools: amazonCapability.canAnalyze
                ? [
                    "amazon.list_marketplaces",
                    "amazon.list_listings",
                    "amazon.list_inventory",
                    "amazon.list_orders",
                    "amazon.list_sales",
                    "amazon.analyze",
                  ]
                : [],
              writesBlocked: true,
              canAnalyze: amazonCapability.canAnalyze,
              planAccess: amazonCapability.planAccess,
              connected: amazonCapability.connected,
              canRead: amazonCapability.canRead,
              missingSteps: amazonCapability.missingSteps,
              guidance: AMAZON_CHAT_GUIDANCE,
            }
          : undefined,
      }) as Prisma.InputJsonValue,
      steps: {
        create: AGENT_PLAN_STEPS.map((name, ordinal) => ({
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          ordinal,
          name,
          status:
            ordinal === 5
              ? ("WAITING_APPROVAL" as const)
              : ("PENDING" as const),
          output:
            name === "generate_content" || name === "create_drafts"
              ? (redactSecrets({
                  status: "not_generated",
                  note: "Content generation is not implemented yet. No drafts were created.",
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
