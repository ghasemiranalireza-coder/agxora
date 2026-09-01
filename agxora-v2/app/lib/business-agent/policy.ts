import "server-only";

import type { AutonomyMode } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { recordExternalAction } from "./audit";
import { assertCanChangeAutonomy } from "./authorize";

const MODES: readonly AutonomyMode[] = ["SAFE", "ASSISTED", "AUTONOMOUS"];

export async function getAgentPolicyForActor(actor: Actor) {
  const row = await prisma.agentPolicy.findUnique({
    where: {
      organizationId_workspaceId: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
      },
    },
  });
  return {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
    mode: row?.mode ?? ("SAFE" as AutonomyMode),
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export async function setAgentPolicyForActor(
  actor: Actor,
  mode: AutonomyMode,
) {
  assertCanChangeAutonomy(actor);
  if (!MODES.includes(mode)) {
    throw new PersistenceError("validation", "Invalid autonomy mode");
  }
  const row = await prisma.agentPolicy.upsert({
    where: {
      organizationId_workspaceId: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
      },
    },
    create: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      mode,
      updatedByUserId: actor.userId,
    },
    update: {
      mode,
      updatedByUserId: actor.userId,
    },
  });
  await recordExternalAction({
    actor,
    action: "autonomy_mode_update",
    status: "completed",
    metadata: { mode },
  });
  return {
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    mode: row.mode,
    updatedAt: row.updatedAt.toISOString(),
  };
}
