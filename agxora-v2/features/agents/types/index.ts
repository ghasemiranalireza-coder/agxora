/**
 * AGXORA AI Agent Operating System — domain types (Phase 27).
 * Agents are first-class, UI-independent, backend-ready.
 */

export type AgentId =
  | "executive_advisor"
  | "sales_agent"
  | "crm_assistant"
  | "project_manager"
  | "workflow_coordinator"
  | "finance_assistant"
  | "document_analyst"
  | "knowledge_assistant"
  | "support_assistant"
  | "meeting_assistant"
  | "website_builder"
  | "social_media"
  | "growth_campaign"
  | "creative_producer"
  | "custom";

export type AgentLifecycleStatus =
  | "draft"
  | "registered"
  | "active"
  | "paused"
  | "error"
  | "retired";

export type AgentHealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type ToolId =
  | "crm"
  | "projects"
  | "finance"
  | "documents"
  | "workflow"
  | "integration"
  | "email"
  | "calendar"
  | "search"
  | "notification"
  | "api"
  | "mcp"
  | "website"
  | "website_publish"
  | "social"
  | "social_publish"
  | "social_schedule"
  | "campaign_plan"
  | "campaign_readiness"
  | "growth_insights"
  | "campaign_execute"
  | "creative"
  | "creative_generate"
  | "creative_publish";

export type MemoryScope =
  | "working"
  | "conversation"
  | "business"
  | "long_term"
  | "workspace"
  | "agent";

export type KnowledgeSourceKind =
  | "company"
  | "documents"
  | "projects"
  | "crm"
  | "policies"
  | "procedures"
  | "vector"
  | "rag";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "failed"
  | "retrying"
  | "blocked";

/** Business goal lifecycle. A goal is the outcome, not a tool call. */
export type BusinessGoalStatus =
  | "draft"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Plan lifecycle. `waiting_for_approval` matches Agent execution
 * `WAITING_FOR_APPROVAL`. Step `blocked` remains the approval wait.
 */
export type PlanLifecycleStatus =
  | "draft"
  | "ready"
  | "running"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Verification is separate from a successful tool result.
 * A mutating step can complete with `not_required` and still leave the goal active
 * until a later step records `verified`.
 */
export type StepVerificationState =
  | "not_required"
  | "pending"
  | "verified"
  | "failed";

export type AgentExecutionLifecycleStatus =
  | "IDLE"
  | "UNDERSTAND"
  | "PLAN"
  | "WAITING_FOR_APPROVAL"
  | "EXECUTING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "BLOCKED";

export type ApprovalState =
  | "REQUIRES_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type StepExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "WAITING_FOR_APPROVAL"
  | "CANCELLED"
  | "BLOCKED";

export type LlmProviderId =
  | "openai"
  | "azure_openai"
  | "anthropic"
  | "google_gemini"
  | "local"
  | "ollama"
  | "mcp"
  | "custom";

export type AgentPermission =
  | "agents.read"
  | "agents.write"
  | "agents.execute"
  | "agents.admin"
  | "tools.invoke"
  | "memory.read"
  | "knowledge.read";

export interface AgentCapabilitySpec {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface AgentDefinition {
  readonly id: AgentId;
  readonly name: string;
  readonly avatar: string;
  readonly description: string;
  readonly role: string;
  readonly capabilities: readonly string[];
  readonly goals: readonly string[];
  readonly instructions: string;
  readonly tools: readonly ToolId[];
  readonly permissions: readonly AgentPermission[];
  readonly knowledgeSources: readonly KnowledgeSourceKind[];
  readonly marketplace: boolean;
  readonly category: string;
}

export interface AgentRuntime {
  readonly instanceId: string;
  readonly organizationId: string;
  readonly agentId: AgentId;
  readonly status: AgentLifecycleStatus;
  readonly health: AgentHealthStatus;
  readonly enabled: boolean;
  readonly queueDepth: number;
  readonly lastHeartbeatAt: string;
  readonly analytics: AgentAnalytics;
  readonly config: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgentAnalytics {
  readonly tasksCompleted: number;
  readonly tasksFailed: number;
  readonly avgExecutionMs: number;
  readonly usageCount: number;
  readonly errorRate: number;
}

export interface AgentToolDefinition {
  readonly id: ToolId;
  readonly name: string;
  readonly description: string;
  readonly module: string;
  readonly sensitive: boolean;
  readonly requiresApproval?: boolean;
  readonly inputSchema?: ToolInputSchema;
  readonly mcpReady?: boolean;
}

export interface ToolInputSchemaProperty {
  readonly type: "string" | "number" | "boolean" | "object" | "array";
  readonly description: string;
}

export interface ToolInputSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, ToolInputSchemaProperty>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

export interface ToolInvocationContext {
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly taskId: string;
  readonly workspaceId?: string;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface ToolInvocationResult {
  readonly ok: boolean;
  readonly output?: unknown;
  readonly error?: string;
  readonly durationMs: number;
  readonly approvalRequired?: boolean;
}

export type ToolHandler = (
  ctx: ToolInvocationContext,
) => Promise<ToolInvocationResult> | ToolInvocationResult;

export interface MemoryRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly agentInstanceId?: string;
  readonly scope: MemoryScope;
  readonly key: string;
  readonly value: unknown;
  readonly createdAt: string;
  readonly expiresAt?: string;
}

export interface KnowledgeDocument {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: KnowledgeSourceKind;
  readonly title: string;
  readonly summary: string;
  readonly sourceRef?: string;
  readonly tags: readonly string[];
  readonly updatedAt: string;
}

export interface PlanStep {
  readonly id: string;
  readonly title: string;
  readonly dependsOn: readonly string[];
  readonly status: TaskStatus;
  readonly toolId?: ToolId;
  /** Registered capability id. Unknown ids must not execute. */
  readonly capabilityId?: string;
  /** Stable UI key. Copy lives in i18n, not in this field. */
  readonly presentationKey?: string;
  /** Capability policy. The registry is authoritative at execution time. */
  readonly approvalRequired?: boolean;
  readonly reason?: string;
  readonly result?: unknown;
  readonly error?: string;
  readonly verification?: StepVerificationState;
  /** Prevents a second mutation for the same step. Not a license to retry writes. */
  readonly idempotencyKey?: string;
}

export interface AgentPlan {
  readonly id: string;
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly taskId?: string;
  readonly goal: string;
  readonly steps: readonly PlanStep[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status?: PlanLifecycleStatus;
  /** Set when this plan belongs to a Business Goal. */
  readonly goalId?: string;
  /** Earlier plan kept intact when a failure is revised. */
  readonly previousPlanId?: string;
  /** Read-only facts used to prepare this plan. Not a license to mutate. */
  readonly plannerContext?: import("../orchestration/plannerContext").BusinessGoalPlannerContext;
}

/**
 * What the user wants. Independent of tool calls.
 * Tenancy is organizationId from the signed-in workspace, never a client-supplied org.
 */
export interface BusinessGoal {
  readonly id: string;
  readonly organizationId: string;
  readonly statement: string;
  readonly goalType?: "crm_follow_up" | "customer_reply" | "follow_up_and_record";
  readonly requestedOutcome?: string;
  readonly status: BusinessGoalStatus;
  readonly planId?: string;
  readonly taskId?: string;
  readonly executionId?: string;
  readonly customerId?: string;
  readonly summary?: string;
  readonly error?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReasoningTrace {
  readonly id: string;
  readonly taskId: string;
  readonly steps: readonly string[];
  readonly reflection?: string;
  readonly selfCheck?: string;
  readonly confidence: number;
  readonly createdAt: string;
}

export interface AgentMessage {
  readonly id: string;
  readonly fromInstanceId: string;
  readonly toInstanceId: string;
  readonly type: "delegate" | "report" | "query" | "supervise";
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface AgentTask {
  readonly id: string;
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: number;
  readonly planId?: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly output?: unknown;
  readonly error?: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly executionId?: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly durationMs?: number;
  readonly createdAt: string;
}

export interface AgentExecution {
  readonly id: string;
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly taskId: string;
  readonly planId?: string;
  readonly goal: string;
  readonly lifecycle: AgentExecutionLifecycleStatus;
  readonly currentStepId?: string;
  readonly result?: unknown;
  readonly error?: string;
  readonly blockedReason?: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly finishedAt?: string;
}

export interface AgentApproval {
  readonly id: string;
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly executionId: string;
  readonly taskId: string;
  readonly planId?: string;
  readonly stepId: string;
  readonly toolId?: ToolId;
  readonly action: string;
  readonly reason: string;
  readonly state: ApprovalState;
  readonly requestedAt: string;
  readonly decidedAt?: string;
  readonly decidedBy?: string;
  readonly comment?: string;
}

export interface StepExecution {
  readonly id: string;
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
  readonly timestamp: string;
}

export interface AgentContextBundle {
  readonly organizationId: string;
  readonly workspaceId?: string;
  readonly business?: Readonly<Record<string, unknown>>;
  readonly workflow?: Readonly<Record<string, unknown>>;
  readonly customer?: Readonly<Record<string, unknown>>;
  readonly project?: Readonly<Record<string, unknown>>;
  readonly extras?: Readonly<Record<string, unknown>>;
}

export interface AgentOsSettings {
  readonly organizationId: string;
  readonly defaultLlmProvider: LlmProviderId;
  readonly maxConcurrentTasks: number;
  readonly enableSupervisor: boolean;
  readonly enableParallelPlaceholders: boolean;
  readonly logLevel: "error" | "warn" | "info" | "debug";
  readonly isolateSensitiveTools: boolean;
}

export interface AgentOsMetrics {
  readonly totalAgents: number;
  readonly activeAgents: number;
  readonly healthyAgents: number;
  readonly tasksToday: number;
  readonly failedToday: number;
  readonly avgExecutionMs: number;
  readonly toolInvocations24h: number;
}

export const DEFAULT_AGENT_OS_SETTINGS: Omit<
  AgentOsSettings,
  "organizationId"
> = {
  defaultLlmProvider: "openai",
  maxConcurrentTasks: 5,
  enableSupervisor: true,
  enableParallelPlaceholders: true,
  logLevel: "info",
  isolateSensitiveTools: true,
};

export const EMPTY_ANALYTICS: AgentAnalytics = {
  tasksCompleted: 0,
  tasksFailed: 0,
  avgExecutionMs: 0,
  usageCount: 0,
  errorRate: 0,
};
