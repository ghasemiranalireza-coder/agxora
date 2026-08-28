/**
 * Phase 60 — authorize + load durable creative asset bytes for an actor.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import {
  getCreativeAssetStore,
  type CreativeAssetRecord,
} from "./assetStore";

type LoadStateFn = (actor: Actor) => Promise<AgentsPersistedState>;

let loadStateOverride: LoadStateFn | null = null;

/** Test-only Agent OS state loader for asset GET. */
export function setCreativeAssetLoadStateForTests(
  loader: LoadStateFn | null,
): void {
  loadStateOverride = loader;
}

export async function loadCreativeAssetForActor(
  actor: Actor,
  creativeProjectId: string,
  assetId: string,
): Promise<CreativeAssetRecord> {
  if (!creativeProjectId?.trim() || !assetId?.trim()) {
    throw new PersistenceError("validation", "Asset path is required");
  }
  if (
    creativeProjectId.includes("..") ||
    assetId.includes("..") ||
    creativeProjectId.includes("/") ||
    assetId.includes("/")
  ) {
    throw new PersistenceError("validation", "Invalid asset path");
  }

  const loadState = loadStateOverride ?? getAgentOsStateForActor;
  const state = await loadState(actor);
  const project = state.creativeProjects.find(
    (item) =>
      item.id === creativeProjectId &&
      item.organizationId === actor.organizationId,
  );
  if (!project) {
    throw new PersistenceError(
      "not_found",
      "Creative project not found for organization",
      {
        details: [
          { field: "creativeProjectId", message: "not_found_or_cross_org" },
        ],
      },
    );
  }

  const store = getCreativeAssetStore();
  const record = await store.get({
    organizationId: actor.organizationId,
    creativeProjectId,
    assetId,
  });

  if (!record) {
    throw new PersistenceError("not_found", "Creative asset not found", {
      details: [{ field: "assetId", message: "not_found" }],
    });
  }

  if (record.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Creative asset organization mismatch", {
      details: [{ field: "organizationId", message: "cross_org" }],
    });
  }

  if (record.creativeProjectId !== creativeProjectId) {
    throw new PersistenceError("forbidden", "Creative asset project mismatch", {
      details: [{ field: "creativeProjectId", message: "mismatch" }],
    });
  }

  return record;
}
