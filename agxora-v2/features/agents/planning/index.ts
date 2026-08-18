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
  readonly taskId?: string;
  readonly goal: string;
  readonly toolId?: import("../types").ToolId;
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
    toolId: input.toolId,
  }));

  const now = new Date().toISOString();
  return {
    id: createId("plan"),
    organizationId: input.organizationId,
    agentInstanceId: input.agentInstanceId,
    taskId: input.taskId,
    goal: input.goal,
    steps,
    createdAt: now,
    updatedAt: now,
  };
}

export function validatePlan(plan: AgentPlan): readonly string[] {
  const errors: string[] = [];
  if (plan.steps.length === 0) {
    errors.push("Plan requires at least one step");
  }
  const ids = new Set(plan.steps.map((step) => step.id));
  for (const step of plan.steps) {
    for (const dependency of step.dependsOn) {
      if (!ids.has(dependency)) {
        errors.push(`Step ${step.id} depends on missing step ${dependency}`);
      }
    }
  }
  return errors;
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
