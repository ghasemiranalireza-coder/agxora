export type WorkflowStatus =
  | "draft"
  | "published"
  | "archived";

export type WorkflowRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface WorkflowStep {
  readonly id: string;
  readonly name: string;
  readonly type: "action" | "condition" | "delay" | "agent";
  readonly config?: Readonly<Record<string, unknown>>;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly status: WorkflowStatus;
  readonly steps: readonly WorkflowStep[];
  readonly version: string;
}

export interface WorkflowRun {
  readonly id: string;
  readonly workflowId: string;
  readonly organizationId: string;
  readonly status: WorkflowRunStatus;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly error?: string;
}
