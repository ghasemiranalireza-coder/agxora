/**
 * AGXORA Workflow Automation Engine — public domain types (Phase 25).
 * UI-independent; backend-ready.
 */

export type WorkflowNodeKind =
  | "trigger"
  | "action"
  | "condition"
  | "delay"
  | "branch"
  | "loop"
  | "variable";

export type TriggerType =
  | "customer.created"
  | "project.created"
  | "invoice.issued"
  | "task.completed"
  | "document.uploaded"
  | "user.invited"
  | "schedule"
  | "webhook"
  | "api.event"
  | "ai.event"
  | "manual";

export type ActionType =
  | "customer.create"
  | "customer.update"
  | "project.create"
  | "document.generate"
  | "notification.send"
  | "email.send"
  | "api.call"
  | "ai.run"
  | "task.assign"
  | "invoice.create"
  | "status.update";

export type ConditionOperator =
  | "equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "empty"
  | "boolean"
  | "date"
  | "status"
  | "custom";

export type WorkflowStatus = "draft" | "active" | "disabled" | "archived";

export type ExecutionStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "retrying";

export type StepExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled";

export type VariableScope = "global" | "workflow" | "runtime" | "output";

export type WorkflowPermission =
  | "workflow.read"
  | "workflow.write"
  | "workflow.execute"
  | "workflow.admin";

export type AutomationNotificationKind =
  | "workflow_failed"
  | "workflow_completed"
  | "workflow_disabled"
  | "execution_error";

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface WorkflowVariable {
  readonly key: string;
  readonly scope: VariableScope;
  readonly value: unknown;
  readonly description?: string;
}

export interface ConditionRule {
  readonly id: string;
  readonly field: string;
  readonly operator: ConditionOperator;
  readonly value?: unknown;
  readonly customExpression?: string;
}

export interface WorkflowNodeBase {
  readonly id: string;
  readonly kind: WorkflowNodeKind;
  readonly label: string;
  readonly description?: string;
  /** Canvas layout — future drag-and-drop. */
  readonly position: { readonly x: number; readonly y: number };
  readonly next?: readonly string[];
  readonly config: Readonly<Record<string, unknown>>;
}

export interface TriggerNode extends WorkflowNodeBase {
  readonly kind: "trigger";
  readonly config: {
    readonly triggerType: TriggerType;
    readonly scheduleCron?: string;
    readonly webhookPath?: string;
    readonly filters?: readonly ConditionRule[];
  };
}

export interface ActionNode extends WorkflowNodeBase {
  readonly kind: "action";
  readonly config: {
    readonly actionType: ActionType;
    readonly params?: Readonly<Record<string, unknown>>;
    readonly aiPrompt?: string;
    readonly outputKey?: string;
  };
}

export interface ConditionNode extends WorkflowNodeBase {
  readonly kind: "condition";
  readonly config: {
    readonly rules: readonly ConditionRule[];
    readonly logic: "and" | "or";
    readonly trueNext?: string;
    readonly falseNext?: string;
  };
}

export interface DelayNode extends WorkflowNodeBase {
  readonly kind: "delay";
  readonly config: {
    readonly delayMs: number;
  };
}

export interface BranchNode extends WorkflowNodeBase {
  readonly kind: "branch";
  readonly config: {
    readonly branches: readonly {
      readonly id: string;
      readonly label: string;
      readonly rules?: readonly ConditionRule[];
      readonly next?: string;
    }[];
    readonly defaultNext?: string;
  };
}

export interface LoopNode extends WorkflowNodeBase {
  readonly kind: "loop";
  readonly config: {
    readonly collectionPath: string;
    readonly itemVariable: string;
    readonly maxIterations: number;
    readonly bodyNext?: string;
    /** Placeholder — future loop semantics. */
    readonly placeholder: true;
  };
}

export interface VariableNode extends WorkflowNodeBase {
  readonly kind: "variable";
  readonly config: {
    readonly assignments: readonly {
      readonly key: string;
      readonly scope: VariableScope;
      readonly expression: string;
    }[];
  };
}

export type WorkflowNode =
  | TriggerNode
  | ActionNode
  | ConditionNode
  | DelayNode
  | BranchNode
  | LoopNode
  | VariableNode;

export interface WorkflowEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
}

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffMs: number;
  readonly backoffMultiplier: number;
}

export interface WorkflowSettings {
  readonly retryPolicy: RetryPolicy;
  readonly executionLimitPerHour: number;
  readonly concurrencyLimit: number;
  readonly timeoutMs: number;
  readonly logLevel: LogLevel;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly status: WorkflowStatus;
  readonly version: number;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  readonly variables: readonly WorkflowVariable[];
  readonly settings: WorkflowSettings;
  readonly templateId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy?: string;
}

export interface StepLogEntry {
  readonly at: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface StepExecution {
  readonly nodeId: string;
  readonly status: StepExecutionStatus;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly error?: string;
  readonly output?: unknown;
  readonly logs: readonly StepLogEntry[];
  readonly attempt: number;
}

export interface WorkflowExecution {
  readonly id: string;
  readonly workflowId: string;
  readonly organizationId: string;
  readonly status: ExecutionStatus;
  readonly triggeredBy: TriggerType | "manual" | "retry" | "system";
  readonly triggerPayload: Readonly<Record<string, unknown>>;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly durationMs?: number;
  readonly steps: readonly StepExecution[];
  readonly variables: Readonly<Record<string, unknown>>;
  readonly error?: string;
  readonly attempt: number;
  readonly cancelled: boolean;
  readonly path: readonly string[];
}

export interface WorkflowTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly triggerType: TriggerType;
  readonly difficulty: "starter" | "intermediate" | "advanced";
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  readonly variables: readonly WorkflowVariable[];
}

export interface AutomationAnalytics {
  readonly totalWorkflows: number;
  readonly activeWorkflows: number;
  readonly executionsToday: number;
  readonly successRate: number;
  readonly failedLast24h: number;
  readonly avgDurationMs: number;
}

export interface AutomationNotification {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: AutomationNotificationKind;
  readonly title: string;
  readonly body: string;
  readonly workflowId?: string;
  readonly executionId?: string;
  readonly href?: string;
  readonly read: boolean;
  readonly createdAt: string;
}

export interface DomainEvent<T = Readonly<Record<string, unknown>>> {
  readonly id: string;
  readonly type: string;
  readonly organizationId: string;
  readonly source: string;
  readonly payload: T;
  readonly occurredAt: string;
  readonly correlationId?: string;
}

export interface ActionHandlerResult {
  readonly ok: boolean;
  readonly output?: unknown;
  readonly error?: string;
}

export interface ActionHandlerContext {
  readonly organizationId: string;
  readonly workflowId: string;
  readonly executionId: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly params: Readonly<Record<string, unknown>>;
  readonly aiPrompt?: string;
}

export type ActionHandler = (
  ctx: ActionHandlerContext,
) => Promise<ActionHandlerResult> | ActionHandlerResult;

export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
  executionLimitPerHour: 500,
  concurrencyLimit: 5,
  timeoutMs: 60_000,
  logLevel: "info",
};
