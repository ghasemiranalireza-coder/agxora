/**
 * Business-goal planning on top of Agent OS plans.
 * Does not approve, execute, or audit by itself.
 */

import { getCapability, type CapabilityContract } from "../capabilities/registry";
import { createMemoryRecord } from "../memory";
import {
  businessGoalMemoryKey,
  type BusinessGoalMemoryValue,
} from "../memory/businessContext";
import { updatePlanStep } from "../planning";
import { agentsStore } from "../store";
import type {
  AgentApproval,
  AgentPlan,
  AgentTask,
  BusinessGoal,
  PlanStep,
} from "../types";

const TENANT_KEYS = new Set([
  "organizationId",
  "workspaceId",
  "tenantId",
  "actorId",
  "userId",
]);

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function isCrmFollowUpGoal(statement: string): boolean {
  return /follow[\s-]?up/i.test(statement) || /prepare a crm/i.test(statement);
}

export function isOrchestrationPlan(
  plan: AgentPlan | undefined | null,
): plan is AgentPlan {
  return Boolean(
    plan && (plan.goalId || plan.steps.some((step) => step.capabilityId)),
  );
}

export function resolveStepCapability(
  step: PlanStep,
): CapabilityContract | undefined {
  if (!step.capabilityId) return undefined;
  return getCapability(step.capabilityId);
}

function stepShell(
  goalId: string,
  key: string,
  title: string,
  capabilityId: string,
  dependsOn: readonly string[],
  approvalRequired: boolean,
): PlanStep {
  const capability = getCapability(capabilityId);
  return {
    id: `${goalId}:${key}`,
    title,
    presentationKey: key,
    dependsOn,
    status: "pending",
    toolId: capability?.toolId,
    capabilityId,
    approvalRequired,
    verification: capability?.verifies ? "pending" : "not_required",
    idempotencyKey: `${goalId}:${key}`,
  };
}

export function buildCrmFollowUpPlan(input: {
  readonly goal: BusinessGoal;
  readonly agentInstanceId: string;
}): AgentPlan {
  const loadId = `${input.goal.id}:load`;
  const prepareId = `${input.goal.id}:prepare`;
  const executeId = `${input.goal.id}:execute`;
  const now = nowIso();
  return {
    id: createId("plan"),
    organizationId: input.goal.organizationId,
    agentInstanceId: input.agentInstanceId,
    goalId: input.goal.id,
    goal: input.goal.statement,
    status: "ready",
    createdAt: now,
    updatedAt: now,
    steps: [
      stepShell(input.goal.id, "load", "Review the customer", "CRM_LOAD_CUSTOMER", [], false),
      stepShell(
        input.goal.id,
        "prepare",
        "Prepare the follow-up note",
        "CRM_PREPARE_NOTE",
        [loadId],
        false,
      ),
      stepShell(
        input.goal.id,
        "execute",
        "Add the follow-up note",
        "CRM_CREATE_NOTE",
        [prepareId],
        true,
      ),
      stepShell(
        input.goal.id,
        "verify",
        "Confirm the note is saved",
        "CRM_VERIFY_NOTE",
        [executeId],
        false,
      ),
    ],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function noteIdFromOutput(output: unknown): string | undefined {
  const note = asRecord(asRecord(output)?.note);
  return typeof note?.id === "string" && note.id.length > 0 ? note.id : undefined;
}

export function outputVerified(output: unknown): boolean {
  return asRecord(output)?.verified === true;
}

function customerIdFromPlan(plan: AgentPlan): string | undefined {
  for (const step of plan.steps) {
    const result = asRecord(step.result);
    if (!result) continue;
    const customer = asRecord(result.customer);
    if (typeof customer?.id === "string" && customer.id.length > 0) {
      return customer.id;
    }
    const draft = asRecord(result.draft);
    if (typeof draft?.customerId === "string" && draft.customerId.length > 0) {
      return draft.customerId;
    }
  }
  return undefined;
}

function draftFromPlan(plan: AgentPlan): { title?: string; body?: string } {
  const prepare = plan.steps.find((step) => step.capabilityId === "CRM_PREPARE_NOTE");
  const draft = asRecord(asRecord(prepare?.result)?.draft);
  return {
    title: typeof draft?.title === "string" ? draft.title : undefined,
    body: typeof draft?.body === "string" ? draft.body : undefined,
  };
}

export function capabilityExecutionContext(input: {
  readonly goal: string;
  readonly step: PlanStep;
  readonly taskInput: Readonly<Record<string, unknown>>;
  readonly plan: AgentPlan;
  readonly capability: CapabilityContract;
}): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.taskInput)) {
    if (TENANT_KEYS.has(key) || key === "action" || key === "capabilityId") continue;
    safe[key] = value;
  }
  const draft = draftFromPlan(input.plan);
  const customerId =
    customerIdFromPlan(input.plan) ??
    (typeof safe.customerId === "string" ? safe.customerId : undefined);
  const execute = input.plan.steps.find(
    (step) => step.capabilityId === "CRM_CREATE_NOTE",
  );
  const noteId = noteIdFromOutput(execute?.result);
  return {
    ...safe,
    step: input.step.title,
    goal: input.goal,
    action: input.capability.action,
    capabilityId: input.capability.id,
    ...(customerId ? { customerId } : {}),
    ...(draft.title ? { title: draft.title } : {}),
    ...(draft.body ? { body: draft.body } : {}),
    ...(noteId ? { noteId } : {}),
    ...(input.step.idempotencyKey
      ? { idempotencyKey: input.step.idempotencyKey }
      : {}),
  };
}

export function applyCapabilityStepSuccess(
  plan: AgentPlan,
  stepId: string,
  output: unknown,
  capability: CapabilityContract,
): AgentPlan {
  return updatePlanStep(plan, stepId, {
    status: "completed",
    result: output,
    error: undefined,
    verification: capability.verifies ? "verified" : "not_required",
  });
}

export function orchestrationPlanGate(
  plan: AgentPlan,
): "ok" | "waiting" | "failed" | "incomplete" {
  if (!isOrchestrationPlan(plan)) return "ok";
  for (const step of plan.steps) {
    if (step.status === "failed") return "failed";
    if (step.status === "blocked" || step.status === "running") return "waiting";
    if (step.status !== "completed" && step.status !== "cancelled") {
      return "incomplete";
    }
  }
  const verify = plan.steps.find((step) => step.capabilityId === "CRM_VERIFY_NOTE");
  if (verify && verify.verification !== "verified") return "failed";
  return "ok";
}

function findGoal(organizationId: string, goalId: string): BusinessGoal | undefined {
  return (agentsStore.getSnapshot().businessGoals ?? []).find(
    (goal) => goal.id === goalId && goal.organizationId === organizationId,
  );
}

function goalIdFromTask(task: AgentTask, plan: AgentPlan | undefined): string | undefined {
  const fromTask = task.input.businessGoalId;
  if (typeof fromTask === "string" && fromTask.length > 0) return fromTask;
  return plan?.goalId;
}

export function syncOrchestration(
  task: AgentTask,
  plan: AgentPlan,
  phase:
    | "running"
    | "waiting_for_approval"
    | "verified_complete"
    | "failed"
    | "cancelled",
  error?: string,
): AgentPlan {
  const goalId = goalIdFromTask(task, plan);
  const now = nowIso();
  let nextPlan = plan;
  if (phase === "running") {
    nextPlan = { ...plan, status: "running", updatedAt: now };
  } else if (phase === "waiting_for_approval") {
    nextPlan = { ...plan, status: "waiting_for_approval", updatedAt: now };
  } else if (phase === "verified_complete") {
    nextPlan = { ...plan, status: "completed", updatedAt: now };
  } else if (phase === "failed") {
    nextPlan = { ...plan, status: "failed", updatedAt: now };
  } else if (phase === "cancelled") {
    nextPlan = { ...plan, status: "cancelled", updatedAt: now };
  }
  agentsStore.upsertPlan(nextPlan);

  if (!goalId) return nextPlan;
  const goal = findGoal(task.organizationId, goalId);
  if (!goal || goal.organizationId !== task.organizationId) return nextPlan;
  if (goal.organizationId !== plan.organizationId) return nextPlan;

  const customerId = customerIdFromPlan(nextPlan) ?? goal.customerId;
  const base: BusinessGoal = {
    ...goal,
    planId: nextPlan.id,
    taskId: task.id,
    executionId: task.executionId,
    customerId,
    updatedAt: now,
  };

  if (phase === "verified_complete") {
    const verify = nextPlan.steps.find(
      (step) => step.capabilityId === "CRM_VERIFY_NOTE",
    );
    if (verify?.verification !== "verified") return nextPlan;
    const noteId = noteIdFromOutput(
      nextPlan.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE")?.result,
    );
    const completed: BusinessGoal = {
      ...base,
      status: "completed",
      error: undefined,
      summary: "verified",
    };
    agentsStore.upsertBusinessGoal(completed);
    const memory: BusinessGoalMemoryValue = {
      kind: "business_goal_outcome",
      goalId: completed.id,
      planId: nextPlan.id,
      statement: completed.statement,
      customerId: completed.customerId,
      noteId,
      verified: true,
      recordedAt: now,
    };
    agentsStore.pushMemory(
      createMemoryRecord({
        organizationId: task.organizationId,
        agentInstanceId: task.agentInstanceId,
        scope: "business",
        key: businessGoalMemoryKey(completed.id),
        value: memory,
      }),
    );
    return nextPlan;
  }

  if (phase === "failed") {
    if (goal.status === "cancelled") return nextPlan;
    agentsStore.upsertBusinessGoal({
      ...base,
      status: "failed",
      error: error ?? goal.error ?? "The follow-up did not finish.",
      summary: undefined,
    });
    return nextPlan;
  }

  if (phase === "cancelled") {
    agentsStore.upsertBusinessGoal({
      ...base,
      status: "cancelled",
      error: error ?? goal.error,
      summary: undefined,
    });
    return nextPlan;
  }

  if (goal.status === "completed" || goal.status === "cancelled" || goal.status === "failed") {
    return nextPlan;
  }
  agentsStore.upsertBusinessGoal({
    ...base,
    status: "active",
    error: undefined,
  });
  return nextPlan;
}

export function failOrchestrationStep(
  plan: AgentPlan,
  stepId: string | undefined,
  message: string,
): AgentPlan {
  if (!stepId) {
    return { ...plan, status: "failed", updatedAt: nowIso() };
  }
  const step = plan.steps.find((item) => item.id === stepId);
  if (!step || step.status === "completed" || step.status === "cancelled") {
    return { ...plan, status: "failed", updatedAt: nowIso() };
  }
  return updatePlanStep(
    { ...plan, status: "failed" },
    stepId,
    {
      status: "failed",
      error: message,
      verification: step.verification === "pending" ? "failed" : step.verification,
    },
  );
}

export function cancelBusinessGoalApproval(
  approval: AgentApproval,
  reason: string,
): void {
  const plan = agentsStore
    .getSnapshot()
    .plans.find((item) => item.id === approval.planId);
  if (!plan?.goalId || plan.organizationId !== approval.organizationId) return;
  const cancelled = updatePlanStep(
    { ...plan, status: "cancelled", updatedAt: nowIso() },
    approval.stepId,
    { status: "cancelled", error: reason },
  );
  agentsStore.upsertPlan(cancelled);
  const task = agentsStore
    .getSnapshot()
    .tasks.find((item) => item.id === approval.taskId);
  if (!task || task.organizationId !== approval.organizationId) return;
  syncOrchestration(task, cancelled, "cancelled", reason);
}
