/**
 * AGXORA AI Workflow & Automation Engine — domain types.
 * Modular foundation so every future AGXORA module can connect.
 */

export type WorkflowElementKind =
  | "trigger"
  | "condition"
  | "delay"
  | "approval"
  | "loop"
  | "merge"
  | "split"
  | "ai_decision"
  | "notification"
  | "webhook"
  | "custom_action"
  | "action"
  | "ai_action";

export type RunStatus = "success" | "failed" | "running" | "pending" | "retried";

export type IntegrationStatus =
  | "connected"
  | "beta"
  | "planned"
  | "coming_soon"
  | "disabled";

export type IntegrationCategory =
  | "Productivity"
  | "Finance"
  | "CRM"
  | "Commerce"
  | "Communication"
  | "ERP";

export type TemplateDifficulty = "starter" | "intermediate" | "advanced";

export interface AutomationKpi {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly caption: string;
  readonly delta?: { readonly value: string; readonly positive: boolean };
}

export interface CatalogItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly kind: WorkflowElementKind;
}

export interface WorkflowNode {
  readonly id: string;
  readonly type: WorkflowElementKind;
  readonly catalogId: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
}

export interface WorkflowEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  readonly updatedAt: string;
}

export interface WorkflowRun {
  readonly id: string;
  readonly workflowId: string;
  readonly workflowName: string;
  readonly status: RunStatus;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly durationMs: number;
  readonly trigger: string;
  readonly detail: string;
  readonly executedBy: string;
  readonly retryAvailable: boolean;
  readonly input: string;
  readonly output: string;
  readonly aiSummary: string;
  readonly errorMessage?: string;
}

export interface WorkflowTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly nodeCount: number;
  readonly estimatedRuntime: string;
  readonly difficulty: TemplateDifficulty;
  readonly recommendedFor: string;
  readonly requiredModules: readonly string[];
  readonly aiFeatures: readonly string[];
  readonly preview: WorkflowDefinition;
}

export interface IntegrationPlan {
  readonly id: string;
  readonly name: string;
  readonly category: IntegrationCategory;
  readonly status: IntegrationStatus;
  readonly adapter: string;
  readonly notes: string;
}

export type AssistantSeverity = "info" | "warning" | "critical" | "opportunity";

export interface AssistantSuggestion {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: AssistantSeverity;
  readonly kind:
    | "missing_approval"
    | "possible_delay"
    | "unused_trigger"
    | "duplicate_nodes"
    | "unused_action"
    | "security"
    | "performance";
}

export interface WorkflowScore {
  readonly score: number;
  readonly label: string;
  readonly suggestions: readonly AssistantSuggestion[];
}

export interface Point {
  readonly x: number;
  readonly y: number;
}
