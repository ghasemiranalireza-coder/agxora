/**
 * Trigger catalog — abstraction for workflow entry points.
 */

import type { TriggerType } from "../types";

export interface TriggerDefinition {
  readonly type: TriggerType;
  readonly label: string;
  readonly description: string;
  readonly eventType: string;
  readonly module: string;
}

export const TRIGGER_CATALOG: readonly TriggerDefinition[] = [
  {
    type: "customer.created",
    label: "Customer created",
    description: "Fires when a CRM customer record is created.",
    eventType: "customer.created",
    module: "crm",
  },
  {
    type: "project.created",
    label: "Project created",
    description: "Fires when a project is created.",
    eventType: "project.created",
    module: "projects",
  },
  {
    type: "invoice.issued",
    label: "Invoice issued",
    description: "Fires when an invoice is issued.",
    eventType: "invoice.issued",
    module: "finance",
  },
  {
    type: "task.completed",
    label: "Task completed",
    description: "Fires when a task is marked complete.",
    eventType: "task.completed",
    module: "projects",
  },
  {
    type: "document.uploaded",
    label: "Document uploaded",
    description: "Fires when a document is uploaded.",
    eventType: "document.uploaded",
    module: "documents",
  },
  {
    type: "user.invited",
    label: "User invited",
    description: "Fires when a team member is invited.",
    eventType: "user.invited",
    module: "identity",
  },
  {
    type: "schedule",
    label: "Schedule",
    description: "Cron / interval schedule trigger.",
    eventType: "automation.schedule",
    module: "automation",
  },
  {
    type: "webhook",
    label: "Webhook",
    description: "Inbound HTTP webhook trigger.",
    eventType: "automation.webhook",
    module: "automation",
  },
  {
    type: "api.event",
    label: "API Event",
    description: "Generic API-emitted domain event.",
    eventType: "api.event",
    module: "api",
  },
  {
    type: "ai.event",
    label: "AI Event",
    description: "AI platform signal (completion, insight, agent step).",
    eventType: "ai.event",
    module: "ai",
  },
  {
    type: "manual",
    label: "Manual trigger",
    description: "Run on demand from the Automation UI or API.",
    eventType: "automation.manual",
    module: "automation",
  },
] as const;

export function getTriggerDefinition(
  type: TriggerType,
): TriggerDefinition | undefined {
  return TRIGGER_CATALOG.find((t) => t.type === type);
}
