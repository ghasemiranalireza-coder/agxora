"use client";

import { agentsStore } from "@/features/agents/store";
import { agentOsService } from "@/features/agents/services";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import { ACTIVATION_CRM_FOLLOW_UP_STATEMENT } from "./statement";

export async function startGuidedCrmFollowUp(input: {
  readonly organizationId: string;
  readonly actorId: string;
  readonly workerId: string;
  readonly customerId: string;
}): Promise<void> {
  const organizationId = input.organizationId.trim();
  const customerId = input.customerId.trim();
  const workerId = input.workerId.trim();
  const actorId = input.actorId.trim();
  if (!organizationId || !customerId || !workerId || !actorId) {
    throw new Error("agents.businessGoal.errors.required");
  }
  await agentsStore.flushPersistence();
  await agentsStore.hydrateAsync({
    force: true,
    forceOrgSwitch: true,
    organizationId,
  });
  agentOsService.ensureWorkspace(organizationId);
  const runtime = agentsStore
    .getSnapshot()
    .runtimes.find(
      (item) => item.agentId === "crm_assistant" && item.organizationId === organizationId,
    );
  if (!runtime) throw new Error("agents.businessGoal.errors.noCrm");
  await startBusinessGoal({
    organizationId,
    agentInstanceId: runtime.instanceId,
    statement: ACTIVATION_CRM_FOLLOW_UP_STATEMENT,
    customerId,
    workerId,
    actorId,
  });
  await agentsStore.flushPersistence();
}
