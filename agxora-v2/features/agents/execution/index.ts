/**
 * Execution domain helpers — bounded lifecycle, approvals, and audit events.
 */

import type {
  AgentApproval,
  AgentExecution,
  AgentExecutionLifecycleStatus,
  ApprovalState,
  StepExecution,
  StepExecutionStatus,
  ToolId,
} from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createExecution(input: {
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly taskId: string;
  readonly goal: string;
  readonly lifecycle?: AgentExecutionLifecycleStatus;
}): AgentExecution {
  const now = nowIso();
  return {
    id: createId("aexec"),
    organizationId: input.organizationId,
    agentInstanceId: input.agentInstanceId,
    taskId: input.taskId,
    goal: input.goal,
    lifecycle: input.lifecycle ?? "IDLE",
    startedAt: now,
    updatedAt: now,
  };
}

export function updateExecutionLifecycle(
  execution: AgentExecution,
  lifecycle: AgentExecutionLifecycleStatus,
  patch?: Partial<AgentExecution>,
): AgentExecution {
  const finishedAt =
    lifecycle === "COMPLETED" ||
    lifecycle === "FAILED" ||
    lifecycle === "CANCELLED"
      ? patch?.finishedAt ?? nowIso()
      : patch?.finishedAt;
  return {
    ...execution,
    ...patch,
    lifecycle,
    finishedAt,
    updatedAt: nowIso(),
  };
}

export function createApproval(input: {
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly executionId: string;
  readonly taskId: string;
  readonly planId?: string;
  readonly stepId: string;
  readonly toolId?: ToolId;
  readonly action: string;
  readonly reason: string;
  readonly state?: ApprovalState;
}): AgentApproval {
  return {
    id: createId("approval"),
    organizationId: input.organizationId,
    agentInstanceId: input.agentInstanceId,
    executionId: input.executionId,
    taskId: input.taskId,
    planId: input.planId,
    stepId: input.stepId,
    toolId: input.toolId,
    action: input.action,
    reason: input.reason,
    state: input.state ?? "REQUIRES_APPROVAL",
    requestedAt: nowIso(),
  };
}

export function resolveApproval(
  approval: AgentApproval,
  state: Extract<ApprovalState, "APPROVED" | "REJECTED">,
  decidedBy?: string,
  comment?: string,
): AgentApproval {
  return {
    ...approval,
    state,
    decidedAt: nowIso(),
    decidedBy,
    comment,
  };
}

export function createStepExecution(input: {
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly executionId: string;
  readonly taskId: string;
  readonly planId?: string;
  readonly stepId?: string;
  readonly toolId?: ToolId;
  readonly action: string;
  readonly status: StepExecutionStatus;
  readonly input?: unknown;
  readonly result?: unknown;
  readonly error?: string;
  readonly approvalState?: ApprovalState;
  readonly durationMs?: number;
}): StepExecution {
  return {
    id: createId("astep"),
    organizationId: input.organizationId,
    agentInstanceId: input.agentInstanceId,
    executionId: input.executionId,
    taskId: input.taskId,
    planId: input.planId,
    stepId: input.stepId,
    toolId: input.toolId,
    action: input.action,
    status: input.status,
    input: sanitizePayload(input.input),
    result: sanitizePayload(input.result),
    error: input.error,
    approvalState: input.approvalState,
    durationMs: input.durationMs,
    timestamp: nowIso(),
  };
}

function sanitizePayload(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    return value.length > 600 ? `${value.slice(0, 597)}...` : value;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return "[unserializable]";
  }
}
