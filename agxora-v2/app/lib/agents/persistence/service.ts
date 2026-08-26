/**
 * Phase 56 — org-scoped Agent OS persistence service.
 * Authority: actor.organizationId from session membership only.
 */

import "server-only";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  emptyAgentsState,
  filterStateForOrganization,
  normalizeState,
  type AgentsPersistedState,
  type LegacyAgentsPersistedState,
} from "@/features/agents/repositories/state";

const SCHEMA_VERSION = 7;

export async function getAgentOsStateForActor(
  actor: Actor,
): Promise<AgentsPersistedState> {
  const row = await prisma.agentOsState.findUnique({
    where: { organizationId: actor.organizationId },
  });
  if (!row) {
    return emptyAgentsState();
  }
  const normalized = normalizeState(
    row.payload as LegacyAgentsPersistedState,
  );
  return filterStateForOrganization(
    normalized ?? emptyAgentsState(),
    actor.organizationId,
  );
}

export async function putAgentOsStateForActor(
  actor: Actor,
  incoming: AgentsPersistedState | LegacyAgentsPersistedState | null | undefined,
): Promise<AgentsPersistedState> {
  if (!incoming || typeof incoming !== "object") {
    throw new PersistenceError("validation", "Missing Agent OS state payload", {
      details: [{ field: "state", message: "required" }],
    });
  }

  const filtered = filterStateForOrganization(incoming, actor.organizationId);
  const payload: AgentsPersistedState = {
    ...filtered,
    version: SCHEMA_VERSION,
  };
  const jsonPayload = payload as unknown as Prisma.InputJsonValue;

  await prisma.agentOsState.upsert({
    where: { organizationId: actor.organizationId },
    create: {
      id: randomUUID(),
      organizationId: actor.organizationId,
      schemaVersion: SCHEMA_VERSION,
      payload: jsonPayload,
    },
    update: {
      schemaVersion: SCHEMA_VERSION,
      payload: jsonPayload,
    },
  });

  return payload;
}
