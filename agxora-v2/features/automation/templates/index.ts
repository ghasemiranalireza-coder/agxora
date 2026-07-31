/**
 * Workflow template library.
 */

import type { WorkflowTemplate } from "../types";

function pos(x: number, y: number) {
  return { x, y };
}

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  {
    id: "tpl_customer_welcome",
    name: "New Customer Welcome",
    description: "Welcome email + notification when a customer is created.",
    category: "CRM",
    triggerType: "customer.created",
    difficulty: "starter",
    variables: [
      {
        key: "welcomeSubject",
        scope: "workflow",
        value: "Welcome to AGXORA",
      },
    ],
    nodes: [
      {
        id: "n_t",
        kind: "trigger",
        label: "Customer created",
        position: pos(80, 120),
        config: { triggerType: "customer.created" },
        next: ["n_email"],
      },
      {
        id: "n_email",
        kind: "action",
        label: "Send welcome email",
        position: pos(320, 120),
        config: {
          actionType: "email.send",
          params: { template: "welcome" },
          outputKey: "emailResult",
        },
        next: ["n_notify"],
      },
      {
        id: "n_notify",
        kind: "action",
        label: "Notify team",
        position: pos(560, 120),
        config: {
          actionType: "notification.send",
          params: { channel: "in_app" },
        },
      },
    ],
    edges: [
      { id: "e1", from: "n_t", to: "n_email" },
      { id: "e2", from: "n_email", to: "n_notify" },
    ],
  },
  {
    id: "tpl_invoice_reminder",
    name: "Invoice Reminder",
    description: "Remind customers after an invoice is issued.",
    category: "Finance",
    triggerType: "invoice.issued",
    difficulty: "starter",
    variables: [],
    nodes: [
      {
        id: "n_t",
        kind: "trigger",
        label: "Invoice issued",
        position: pos(80, 120),
        config: { triggerType: "invoice.issued" },
        next: ["n_delay"],
      },
      {
        id: "n_delay",
        kind: "delay",
        label: "Wait 3 days",
        position: pos(300, 120),
        config: { delayMs: 100 },
        next: ["n_cond"],
      },
      {
        id: "n_cond",
        kind: "condition",
        label: "Still unpaid?",
        position: pos(520, 120),
        config: {
          logic: "and",
          rules: [
            {
              id: "r1",
              field: "trigger.status",
              operator: "status",
              value: "open",
            },
          ],
          trueNext: "n_email",
        },
      },
      {
        id: "n_email",
        kind: "action",
        label: "Send reminder",
        position: pos(760, 120),
        config: {
          actionType: "email.send",
          params: { template: "invoice_reminder" },
        },
      },
    ],
    edges: [
      { id: "e1", from: "n_t", to: "n_delay" },
      { id: "e2", from: "n_delay", to: "n_cond" },
      { id: "e3", from: "n_cond", to: "n_email", label: "yes" },
    ],
  },
  {
    id: "tpl_project_kickoff",
    name: "Project Kickoff",
    description: "Assign kickoff task and notify when a project is created.",
    category: "Projects",
    triggerType: "project.created",
    difficulty: "intermediate",
    variables: [],
    nodes: [
      {
        id: "n_t",
        kind: "trigger",
        label: "Project created",
        position: pos(80, 100),
        config: { triggerType: "project.created" },
        next: ["n_task"],
      },
      {
        id: "n_task",
        kind: "action",
        label: "Assign kickoff task",
        position: pos(320, 100),
        config: {
          actionType: "task.assign",
          params: { title: "Project kickoff" },
        },
        next: ["n_notify"],
      },
      {
        id: "n_notify",
        kind: "action",
        label: "Notify owner",
        position: pos(560, 100),
        config: { actionType: "notification.send" },
      },
    ],
    edges: [
      { id: "e1", from: "n_t", to: "n_task" },
      { id: "e2", from: "n_task", to: "n_notify" },
    ],
  },
  {
    id: "tpl_task_assignment",
    name: "Task Assignment",
    description: "Email assignee when a task is completed — chain next work.",
    category: "Projects",
    triggerType: "task.completed",
    difficulty: "starter",
    variables: [],
    nodes: [
      {
        id: "n_t",
        kind: "trigger",
        label: "Task completed",
        position: pos(80, 120),
        config: { triggerType: "task.completed" },
        next: ["n_status"],
      },
      {
        id: "n_status",
        kind: "action",
        label: "Update status",
        position: pos(320, 120),
        config: {
          actionType: "status.update",
          params: { status: "done" },
        },
        next: ["n_email"],
      },
      {
        id: "n_email",
        kind: "action",
        label: "Notify stakeholders",
        position: pos(560, 120),
        config: { actionType: "email.send" },
      },
    ],
    edges: [
      { id: "e1", from: "n_t", to: "n_status" },
      { id: "e2", from: "n_status", to: "n_email" },
    ],
  },
  {
    id: "tpl_ai_customer_summary",
    name: "AI Customer Summary",
    description: "Run AI summary when a customer is created; store output.",
    category: "AI",
    triggerType: "customer.created",
    difficulty: "advanced",
    variables: [
      {
        key: "summaryPrompt",
        scope: "workflow",
        value: "Summarize this customer for the account team.",
      },
    ],
    nodes: [
      {
        id: "n_t",
        kind: "trigger",
        label: "Customer created",
        position: pos(80, 120),
        config: { triggerType: "customer.created" },
        next: ["n_ai"],
      },
      {
        id: "n_ai",
        kind: "action",
        label: "Run AI summary",
        position: pos(320, 120),
        config: {
          actionType: "ai.run",
          aiPrompt: "{{summaryPrompt}} Context: {{trigger}}",
          outputKey: "aiSummary",
        },
        next: ["n_doc"],
      },
      {
        id: "n_doc",
        kind: "action",
        label: "Generate document",
        position: pos(560, 120),
        config: {
          actionType: "document.generate",
          params: { title: "Customer AI Summary" },
        },
      },
    ],
    edges: [
      { id: "e1", from: "n_t", to: "n_ai" },
      { id: "e2", from: "n_ai", to: "n_doc" },
    ],
  },
  {
    id: "tpl_followup_reminder",
    name: "Follow-up Reminder",
    description: "Schedule-based follow-up with branch by status.",
    category: "CRM",
    triggerType: "schedule",
    difficulty: "intermediate",
    variables: [],
    nodes: [
      {
        id: "n_t",
        kind: "trigger",
        label: "Daily schedule",
        position: pos(80, 140),
        config: { triggerType: "schedule", scheduleCron: "0 9 * * *" },
        next: ["n_branch"],
      },
      {
        id: "n_branch",
        kind: "branch",
        label: "By priority",
        position: pos(300, 140),
        config: {
          branches: [
            {
              id: "high",
              label: "High",
              rules: [
                {
                  id: "r1",
                  field: "trigger.priority",
                  operator: "equals",
                  value: "high",
                },
              ],
              next: "n_notify",
            },
          ],
          defaultNext: "n_email",
        },
      },
      {
        id: "n_notify",
        kind: "action",
        label: "Urgent notification",
        position: pos(560, 60),
        config: { actionType: "notification.send" },
      },
      {
        id: "n_email",
        kind: "action",
        label: "Standard email",
        position: pos(560, 220),
        config: { actionType: "email.send" },
      },
    ],
    edges: [
      { id: "e1", from: "n_t", to: "n_branch" },
      { id: "e2", from: "n_branch", to: "n_notify", label: "high" },
      { id: "e3", from: "n_branch", to: "n_email", label: "default" },
    ],
  },
] as const;

export function getWorkflowTemplate(
  id: string,
): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

export function listWorkflowTemplates(
  category?: string,
): readonly WorkflowTemplate[] {
  if (!category) return WORKFLOW_TEMPLATES;
  return WORKFLOW_TEMPLATES.filter((t) => t.category === category);
}
