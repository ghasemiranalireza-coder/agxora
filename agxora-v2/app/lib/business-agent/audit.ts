import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import type { ExternalActionStatus, IntegrationProvider, Prisma } from "@prisma/client";
import { redactSecrets } from "./redact";

export async function recordExternalAction(input: {
  readonly actor: Actor;
  readonly action: string;
  readonly status: ExternalActionStatus;
  readonly provider?: IntegrationProvider | null;
  readonly target?: string | null;
  readonly agentRunId?: string | null;
  readonly externalId?: string | null;
  readonly error?: string | null;
  readonly metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.externalActionAudit.create({
    data: {
      organizationId: input.actor.organizationId,
      workspaceId: input.actor.workspaceId,
      userId: input.actor.userId,
      agentRunId: input.agentRunId ?? null,
      provider: input.provider ?? null,
      action: input.action,
      target: input.target ?? null,
      status: input.status,
      externalId: input.externalId ?? null,
      error: input.error ?? null,
      metadata: redactSecrets(input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listExternalActionsForActor(
  actor: Actor,
  limit = 50,
) {
  return prisma.externalActionAudit.findMany({
    where: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      organizationId: true,
      workspaceId: true,
      userId: true,
      agentRunId: true,
      provider: true,
      action: true,
      target: true,
      status: true,
      externalId: true,
      error: true,
      metadata: true,
      createdAt: true,
    },
  });
}
