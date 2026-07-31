/**
 * Planning engine — goal decomposition, dependencies, progress.
 */

import type { AgentPlan, PlanStep, TaskStatus } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function decomposeGoal(input: {
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly goal: string;
}): AgentPlan {
  const parts = input.goal
    .split(/[.;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const goals = parts.length > 0 ? parts : [input.goal];
  const steps: PlanStep[] = goals.map((title, index) => ({
    id: `step_${index + 1}`,
    title,
    dependsOn: index === 0 ? [] : [`step_${index}`],
    status: "pending" as TaskStatus,
  }));

  const now = new Date().toISOString();
  return {
    id: createId("plan"),
    organizationId: input.organizationId,
    agentInstanceId: input.agentInstanceId,
    goal: input.goal,
    steps,
    createdAt: now,
    updatedAt: now,
  };
}

export function nextExecutableSteps(plan: AgentPlan): readonly PlanStep[] {
  const done = new Set(
    plan.steps.filter((s) => s.status === "completed").map((s) => s.id),
  );
  return plan.steps.filter(
    (s) =>
      s.status === "pending" &&
      s.dependsOn.every((d) => done.has(d)),
  );
}

export function markStepStatus(
  plan: AgentPlan,
  stepId: string,
  status: TaskStatus,
): AgentPlan {
  return {
    ...plan,
    steps: plan.steps.map((s) => (s.id === stepId ? { ...s, status } : s)),
    updatedAt: new Date().toISOString(),
  };
}
