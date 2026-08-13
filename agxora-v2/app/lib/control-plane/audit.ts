import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import type { ControlAuditAction } from "./types";

export async function recordControlAudit(input: {
  readonly actor: Actor;
  readonly action: ControlAuditAction;
  readonly workspaceId?: string | null;
  readonly targetUserId?: string | null;
  readonly invitationId?: string | null;
  readonly metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await prisma.controlPlaneAuditEvent.create({
    data: {
      organizationId: input.actor.organizationId,
      workspaceId: input.workspaceId ?? input.actor.workspaceId,
      actorUserId: input.actor.userId,
      action: input.action,
      targetUserId: input.targetUserId ?? null,
      invitationId: input.invitationId ?? null,
      metadata: input.metadata ?? {},
    },
  });
}
