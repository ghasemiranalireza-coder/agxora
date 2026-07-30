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

export type TriggerKind =
  | "customer_created"
  | "lead_created"
  | "invoice_created"
  | "invoice_paid"
  | "order_created"
  | "order_completed"
  | "document_uploaded"
  | "campaign_published"
  | "employee_added"
  | "task_completed"
  | "manual"
  | "schedule"
  | "webhook"
  | "api";

export type ActionKind =
  | "create_crm_record"
  | "generate_invoice"
  | "generate_quote"
  | "generate_delivery_note"
  | "create_task"
  | "assign_employee"
  | "send_email"
  | "send_notification"
  | "generate_ai_summary"
  | "generate_ai_content"
  | "update_customer"
  | "update_status"
  | "export_pdf"
  | "future_api";

export type AiActionKind =
  | "ai_decision"
  | "ai_classification"
  | "ai_text_generation"
  | "ai_translation"
  | "ai_email_reply"
  | "ai_summarization"
  | "ai_recommendations"
  | "ai_routing";

export type RunStatus = "success" | "failed" | "running" | "pending" | "retried";

export type IntegrationStatus = "planned" | "ready" | "connected" | "disabled";

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
  readonly durationMs: number;
  readonly trigger: string;
  readonly detail: string;
}

export interface WorkflowTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly nodeCount: number;
}

export interface IntegrationPlan {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly status: IntegrationStatus;
  readonly adapter: string;
  readonly notes: string;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}
