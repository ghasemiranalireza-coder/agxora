"use client";

/**
 * Reload the server-stored first marketing draft.
 * Does not start a second prepare, goal, or execution.
 */

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

export async function resumeFirstMarketingGoal(): Promise<"already" | "missing" | "paused"> {
  await agentsStore.hydrateAsync({ force: true });
  const snapshot = agentsStore.getSnapshot();
  const goal = firstGoal(snapshot.businessGoals);
  if (!goal?.planId) return "missing";
  const runtime = snapshot.runtimes.find(
    (item) => item.agentId === "crm_assistant" && item.organizationId === goal.organizationId,
  );
  if (runtime?.status === "paused") return "paused";
  const plan = snapshot.plans.find((item) => item.id === goal.planId && item.organizationId === goal.organizationId);
  const prepare = plan?.steps.find((step) => step.capabilityId === "MARKETING_PREPARE_PLAN");
  const result = prepare?.result;
  const stored = result && typeof result === "object" && result !== null && "plan" in result
    ? (result as { plan?: unknown }).plan
    : undefined;
  if (!stored || !goal.taskId || !snapshot.tasks.some((task) => task.id === goal.taskId)) return "missing";
  return "already";
}
