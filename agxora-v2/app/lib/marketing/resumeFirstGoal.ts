"use client";

/**
 * Continue a server-created marketing goal through the existing Agent OS runner.
 * Does not create a second goal.
 */

import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { FIRST_MARKETING_GOAL_STATEMENT, findFirstMarketingGoal } from "./firstResult";
import type { BusinessGoal } from "@/features/agents/types";

function firstGoal(goals: readonly BusinessGoal[] | undefined): BusinessGoal | null {
  const organizations = new Set((goals ?? []).map((goal) => goal.organizationId));
  for (const organizationId of organizations) {
    const found = findFirstMarketingGoal(goals, organizationId);
    if (found?.statement.trim() === FIRST_MARKETING_GOAL_STATEMENT) return found;
  }
  return null;
}

export async function resumeFirstMarketingGoal(): Promise<"started" | "already" | "missing" | "paused"> {
  await agentsStore.hydrateAsync({ force: true });
  const snapshot = agentsStore.getSnapshot();
  const goal = firstGoal(snapshot.businessGoals);
  if (!goal?.planId) return "missing";
  if (goal.taskId && snapshot.tasks.some((task) => task.id === goal.taskId)) return "already";

  agentOsService.ensureWorkspace(goal.organizationId);
  const runtime = agentsStore
    .getSnapshot()
    .runtimes.find((item) => item.agentId === "crm_assistant" && item.organizationId === goal.organizationId);
  if (!runtime || !runtime.enabled) return "missing";
  if (runtime.status === "paused") return "paused";
  const plan = agentsStore
    .getSnapshot()
    .plans.find((item) => item.id === goal.planId && item.organizationId === goal.organizationId);
  if (!plan) return "missing";

  const task = await agentOsService.enqueueTask({
    organizationId: goal.organizationId,
    agentInstanceId: runtime.instanceId,
    title: goal.statement,
    goal: goal.statement,
    plan,
    maxAttempts: 1,
    payload: {
      businessGoalId: goal.id,
      workerId: goal.workerId,
      actorId: goal.actorId,
      marketingOffer: goal.marketingOffer,
      marketingNarrowed: goal.marketingNarrowed === true,
      channelIntent: goal.channelIntent,
    },
  });
  const linked = agentsStore.getSnapshot().businessGoals?.find((item) => item.id === goal.id);
  if (linked && linked.taskId !== task.id) {
    agentsStore.upsertBusinessGoal({
      ...linked,
      taskId: task.id,
      executionId: task.executionId,
      updatedAt: new Date().toISOString(),
    });
  }
  return "started";
}
