import type {
  AutomationKpi,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowTemplate,
} from "./types";

export const AUTOMATION_KPIS: readonly AutomationKpi[] = [
  {
    id: "active",
    label: "Active Workflows",
    value: "24",
    caption: "Enabled in workspace",
    delta: { value: "+3", positive: true },
  },
  {
    id: "runs-today",
    label: "Workflow Runs Today",
    value: "186",
    caption: "Across all triggers",
    delta: { value: "+22", positive: true },
  },
  {
    id: "success",
    label: "Successful Automations",
    value: "172",
    caption: "Today",
    delta: { value: "92.5%", positive: true },
  },
  {
    id: "failed",
    label: "Failed Runs",
    value: "7",
    caption: "Needs attention",
    delta: { value: "-2", positive: true },
  },
  {
    id: "pending",
    label: "Pending Tasks",
    value: "14",
    caption: "Approvals + retries",
    delta: { value: "+1", positive: false },
  },
  {
    id: "avg-time",
    label: "Average Execution Time",
    value: "1.8s",
    caption: "Median 1.2s",
    delta: { value: "-120ms", positive: true },
  },
  {
    id: "ai-suggestions",
    label: "AI Suggestions",
    value: "11",
    caption: "Automation opportunities",
    delta: { value: "+4", positive: true },
  },
];

export const DEFAULT_WORKFLOW: WorkflowDefinition = {
  id: "wf-onboarding",
  name: "Customer Onboarding",
  description: "Welcome sequence when a customer is created.",
  active: true,
  updatedAt: "2026-07-30T12:00:00Z",
  nodes: [
    {
      id: "n1",
      type: "trigger",
      catalogId: "tr-customer",
      label: "Customer Created",
      x: 80,
      y: 160,
    },
    {
      id: "n2",
      type: "action",
      catalogId: "ac-email",
      label: "Send Email",
      x: 320,
      y: 160,
    },
    {
      id: "n3",
      type: "ai_action",
      catalogId: "ai-sum",
      label: "AI Summarization",
      x: 560,
      y: 160,
    },
    {
      id: "n4",
      type: "action",
      catalogId: "ac-task",
      label: "Create Task",
      x: 800,
      y: 160,
    },
    {
      id: "n5",
      type: "condition",
      catalogId: "el-condition",
      label: "Condition",
      x: 560,
      y: 320,
    },
    {
      id: "n6",
      type: "notification",
      catalogId: "el-notification",
      label: "Notification",
      x: 800,
      y: 320,
    },
  ],
  edges: [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4" },
    { id: "e4", from: "n3", to: "n5" },
    { id: "e5", from: "n5", to: "n6" },
  ],
};

export const WORKFLOW_RUNS: readonly WorkflowRun[] = [
  {
    id: "run-1",
    workflowId: "wf-onboarding",
    workflowName: "Customer Onboarding",
    status: "success",
    startedAt: "2026-07-30T15:12:00Z",
    durationMs: 1420,
    trigger: "Customer Created",
    detail: "Welcome email sent · task assigned to Sara M.",
  },
  {
    id: "run-2",
    workflowId: "wf-invoice-reminder",
    workflowName: "Invoice Reminder",
    status: "success",
    startedAt: "2026-07-30T14:40:00Z",
    durationMs: 980,
    trigger: "Schedule Trigger",
    detail: "Reminder email dispatched for INV-2026-1004.",
  },
  {
    id: "run-3",
    workflowId: "wf-lead-followup",
    workflowName: "Lead Follow-up",
    status: "failed",
    startedAt: "2026-07-30T13:05:00Z",
    durationMs: 2100,
    trigger: "Lead Created",
    detail: "Email adapter timeout — retry available.",
  },
  {
    id: "run-4",
    workflowId: "wf-content-publish",
    workflowName: "Content Publishing",
    status: "success",
    startedAt: "2026-07-30T11:22:00Z",
    durationMs: 3100,
    trigger: "Campaign Published",
    detail: "Analytics snapshot + Slack notify queued.",
  },
  {
    id: "run-5",
    workflowId: "wf-approval",
    workflowName: "Approval Process",
    status: "pending",
    startedAt: "2026-07-30T10:50:00Z",
    durationMs: 0,
    trigger: "Manual Trigger",
    detail: "Waiting on approval from Tom K.",
  },
  {
    id: "run-6",
    workflowId: "wf-lead-followup",
    workflowName: "Lead Follow-up",
    status: "retried",
    startedAt: "2026-07-30T09:18:00Z",
    durationMs: 1650,
    trigger: "Lead Created",
    detail: "Succeeded on second attempt.",
  },
];

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  {
    id: "tpl-onboarding",
    name: "Customer Onboarding",
    description: "Welcome email, AI summary, and owner task.",
    category: "CRM",
    nodeCount: 6,
  },
  {
    id: "tpl-invoice",
    name: "Invoice Reminder",
    description: "Scheduled reminders for open invoices.",
    category: "Finance",
    nodeCount: 5,
  },
  {
    id: "tpl-lead",
    name: "Lead Follow-up",
    description: "AI email reply + pipeline status update.",
    category: "Sales",
    nodeCount: 7,
  },
  {
    id: "tpl-welcome",
    name: "Welcome Email",
    description: "Simple welcome sequence on signup.",
    category: "Marketing",
    nodeCount: 3,
  },
  {
    id: "tpl-pipeline",
    name: "Sales Pipeline",
    description: "Stage changes with notifications and tasks.",
    category: "Sales",
    nodeCount: 8,
  },
  {
    id: "tpl-recruit",
    name: "Recruitment",
    description: "Candidate routing and interview tasks.",
    category: "HR",
    nodeCount: 6,
  },
  {
    id: "tpl-content",
    name: "Content Publishing",
    description: "Creator Studio publish → notify → analytics.",
    category: "Creator",
    nodeCount: 5,
  },
  {
    id: "tpl-approval",
    name: "Approval Process",
    description: "Multi-step approval with AI recommendations.",
    category: "Ops",
    nodeCount: 7,
  },
];

export function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function integrationLabel(status: string): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "ready":
      return "Ready";
    case "disabled":
      return "Disabled";
    default:
      return "Planned";
  }
}

export function runStatusLabel(status: string): string {
  switch (status) {
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "pending":
      return "Pending";
    case "retried":
      return "Retry";
    default:
      return status;
  }
}
