/**
 * Activate the Marketing Worker on the existing Agent OS document.
 */

import "server-only";

import { assertMarketingWorkforceAllowed } from "@/app/lib/billing/enforce";
import { getAgentOsStateForActor, putAgentOsStateForActor } from "@/app/lib/agents/persistence";
import type { Actor } from "@/app/lib/tenancy/types";
import type { AgentsPersistedState } from "@/features/agents/repositories";
import type { WorkforceWorker } from "@/features/agents/types";
import { buildActivationMarketingWorker } from "./workerRecord";

export async function activateMarketingWorkerForActor(actor: Actor): Promise<WorkforceWorker> {
  await assertMarketingWorkforceAllowed(actor.organizationId);
  const state = await getAgentOsStateForActor(actor);
  const workers = state.workers ?? [];
  const existing = workers.find(
    (worker) => worker.organizationId === actor.organizationId && worker.role === "MARKETING",
  );
  if (existing && existing.status === "ACTIVE") {
    const allowed = buildActivationMarketingWorker(actor.organizationId).allowedCapabilities;
    if (existing.allowedCapabilities.join("|") === allowed.join("|")) return existing;
  }
  const replacement = buildActivationMarketingWorker(actor.organizationId);
  const nextWorker: WorkforceWorker = existing
    ? { ...replacement, id: existing.id, createdAt: existing.createdAt, status: "ACTIVE" }
    : replacement;
  const next: AgentsPersistedState = {
    ...state,
    workers: [...workers.filter((worker) => worker.id !== nextWorker.id && worker.role !== "MARKETING"), nextWorker],
  };
  await putAgentOsStateForActor(actor, next);
  return nextWorker;
}
