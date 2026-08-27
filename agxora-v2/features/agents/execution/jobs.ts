import type { AgentId, ToolId } from "../types";

export type ExecutionJobStatus =
  | "QUEUED"
  | "WAITING_FOR_APPROVAL"
  | "READY"
  | "RUNNING"
  | "VERIFYING"
  | "BLOCKED"
  | "RETRYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ExecutionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type ExecutionEventType =
  | "QUEUED"
  | "APPROVAL_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "STARTED"
  | "VERIFICATION_STARTED"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "RETRY_REQUESTED"
  | "CANCELLED";

export type ExecutionResultStatus =
  | "unavailable"
  | "completed"
  | "blocked"
  | "failed"
  | "rejected"
  | "cancelled";

export interface ExecutionRetryPolicy {
  readonly retryable: boolean;
  readonly maxAttempts: number;
}

export interface ExecutionBlocker {
  readonly code: string;
  readonly retryable: boolean;
}

export interface ExecutionResult {
  readonly success: boolean;
  readonly status: ExecutionResultStatus;
  readonly externalEffect: boolean;
  readonly message: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface ExecutionAttempt {
  readonly id: string;
  readonly executionJobId: string;
  readonly attempt: number;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly status: ExecutionJobStatus;
  readonly result?: ExecutionResult;
  readonly error?: string;
}

export interface ExecutionEvent {
  readonly id: string;
  readonly organizationId: string;
  readonly executionJobId: string;
  readonly timestamp: string;
  readonly type: ExecutionEventType;
  readonly actor: string;
  readonly message: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface ExecutionJob {
  readonly id: string;
  readonly organizationId: string;
  readonly agentId: AgentId;
  readonly campaignId?: string;
  readonly campaignTaskId?: string;
  readonly taskId?: string;
  readonly toolId: ToolId;
  readonly title: string;
  readonly status: ExecutionJobStatus;
  readonly priority: ExecutionPriority;
  readonly requiresApproval: boolean;
  readonly approvalId?: string;
  readonly paused: boolean;
  readonly queueSeq: number;
  readonly attempts: readonly ExecutionAttempt[];
  readonly maxAttempts: number;
  readonly retryable: boolean;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly lastError?: string;
  readonly blocker?: ExecutionBlocker;
  readonly result?: ExecutionResult;
  readonly params: Readonly<Record<string, unknown>>;
  readonly updatedAt: string;
}

export const DEFAULT_MAX_ATTEMPTS = 3;

export const PRIORITY_RANK: Readonly<Record<ExecutionPriority, number>> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export const EXTERNAL_SIDE_EFFECT_TOOLS: readonly ToolId[] = [
  "website_publish",
  "social_publish",
  "social_schedule",
  "campaign_execute",
  "creative_generate",
];

export const EXECUTION_PRIORITIES: readonly ExecutionPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export function isExternalSideEffectTool(toolId: ToolId): boolean {
  return EXTERNAL_SIDE_EFFECT_TOOLS.includes(toolId);
}

export function agentIdForTool(toolId: ToolId): AgentId {
  if (toolId === "website" || toolId === "website_publish") return "website_builder";
  if (toolId === "social" || toolId === "social_publish" || toolId === "social_schedule") {
    return "social_media";
  }
  if (
    toolId === "campaign_plan" ||
    toolId === "campaign_readiness" ||
    toolId === "growth_insights" ||
    toolId === "campaign_execute"
  ) {
    return "growth_campaign";
  }
  if (toolId === "creative" || toolId === "creative_generate") {
    return "creative_producer";
  }
  if (toolId === "crm" || toolId === "email") return "crm_assistant";
  return "custom";
}

export function defaultRetryPolicy(toolId: ToolId): ExecutionRetryPolicy {
  if (isExternalSideEffectTool(toolId)) {
    return { retryable: false, maxAttempts: 1 };
  }
  return { retryable: true, maxAttempts: DEFAULT_MAX_ATTEMPTS };
}

export function canRetryJob(job: ExecutionJob): boolean {
  return (
    job.status === "FAILED" &&
    job.retryable === true &&
    !job.blocker &&
    job.attempts.length < job.maxAttempts
  );
}

export function compareExecutionJobs(a: ExecutionJob, b: ExecutionJob): number {
  const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (rank !== 0) return rank;
  if (a.queueSeq !== b.queueSeq) return a.queueSeq - b.queueSeq;
  return a.id.localeCompare(b.id);
}
