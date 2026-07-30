import type { CatalogItem, IntegrationPlan } from "./types";

export const WORKFLOW_ELEMENTS: readonly CatalogItem[] = [
  { id: "el-trigger", label: "Trigger", description: "Start when an event fires", kind: "trigger" },
  { id: "el-condition", label: "Condition", description: "Branch on rules", kind: "condition" },
  { id: "el-delay", label: "Delay", description: "Wait before continuing", kind: "delay" },
  { id: "el-approval", label: "Approval", description: "Human approval gate", kind: "approval" },
  { id: "el-loop", label: "Loop", description: "Iterate over a collection", kind: "loop" },
  { id: "el-merge", label: "Merge", description: "Join parallel paths", kind: "merge" },
  { id: "el-split", label: "Split", description: "Fan-out parallel paths", kind: "split" },
  { id: "el-ai-decision", label: "AI Decision", description: "Route via AI", kind: "ai_decision" },
  { id: "el-notification", label: "Notification", description: "In-app alert", kind: "notification" },
  { id: "el-webhook", label: "Webhook Placeholder", description: "HTTP callback reserved", kind: "webhook" },
  { id: "el-custom", label: "Custom Action", description: "Extensible action slot", kind: "custom_action" },
];

export const AVAILABLE_TRIGGERS: readonly CatalogItem[] = [
  { id: "tr-customer", label: "Customer Created", description: "CRM customer record created", kind: "trigger" },
  { id: "tr-lead", label: "Lead Created", description: "New lead enters pipeline", kind: "trigger" },
  { id: "tr-invoice", label: "Invoice Created", description: "Finance invoice issued", kind: "trigger" },
  { id: "tr-invoice-paid", label: "Invoice Paid", description: "Payment settled", kind: "trigger" },
  { id: "tr-order", label: "Order Created", description: "Order entered", kind: "trigger" },
  { id: "tr-order-done", label: "Order Completed", description: "Order fulfilled", kind: "trigger" },
  { id: "tr-doc", label: "Document Uploaded", description: "Document vault upload", kind: "trigger" },
  { id: "tr-campaign", label: "Campaign Published", description: "Creator Studio publish", kind: "trigger" },
  { id: "tr-employee", label: "Employee Added", description: "Team directory change", kind: "trigger" },
  { id: "tr-task", label: "Task Completed", description: "Task marked done", kind: "trigger" },
  { id: "tr-manual", label: "Manual Trigger", description: "Run on demand", kind: "trigger" },
  { id: "tr-schedule", label: "Schedule Trigger", description: "Cron / calendar schedule", kind: "trigger" },
  { id: "tr-webhook", label: "Webhook Trigger", description: "Inbound HTTP event", kind: "trigger" },
  { id: "tr-api", label: "API Trigger", description: "Programmatic start", kind: "trigger" },
];

export const AVAILABLE_ACTIONS: readonly CatalogItem[] = [
  { id: "ac-crm", label: "Create CRM Record", description: "Write CRM entity", kind: "action" },
  { id: "ac-invoice", label: "Generate Invoice", description: "Finance invoice", kind: "action" },
  { id: "ac-quote", label: "Generate Quote", description: "Create quote document", kind: "action" },
  { id: "ac-delivery", label: "Generate Delivery Note", description: "Lieferschein", kind: "action" },
  { id: "ac-task", label: "Create Task", description: "Open a task", kind: "action" },
  { id: "ac-assign", label: "Assign Employee", description: "Route to teammate", kind: "action" },
  { id: "ac-email", label: "Send Email", description: "Outbound email", kind: "action" },
  { id: "ac-notify", label: "Send Notification", description: "In-app notification", kind: "action" },
  { id: "ac-ai-summary", label: "Generate AI Summary", description: "Summarize context", kind: "action" },
  { id: "ac-ai-content", label: "Generate AI Content", description: "Creator Studio draft", kind: "action" },
  { id: "ac-update-customer", label: "Update Customer", description: "Patch CRM customer", kind: "action" },
  { id: "ac-update-status", label: "Update Status", description: "Change entity status", kind: "action" },
  { id: "ac-pdf", label: "Export PDF", description: "Document export", kind: "action" },
  { id: "ac-future", label: "Future API Placeholder", description: "Reserved action slot", kind: "action" },
];

export const AI_ACTIONS: readonly CatalogItem[] = [
  { id: "ai-decision", label: "AI Decision", description: "Decide next path", kind: "ai_action" },
  { id: "ai-class", label: "AI Classification", description: "Classify records", kind: "ai_action" },
  { id: "ai-text", label: "AI Text Generation", description: "Generate text", kind: "ai_action" },
  { id: "ai-translate", label: "AI Translation", description: "Translate content", kind: "ai_action" },
  { id: "ai-email", label: "AI Email Reply", description: "Draft reply", kind: "ai_action" },
  { id: "ai-sum", label: "AI Summarization", description: "Condense context", kind: "ai_action" },
  { id: "ai-rec", label: "AI Recommendations", description: "Suggest next steps", kind: "ai_action" },
  { id: "ai-route", label: "AI Routing", description: "Route to owner / queue", kind: "ai_action" },
];

/**
 * Future integrations — architecture only. No fake live APIs.
 */
export const AUTOMATION_INTEGRATIONS: readonly IntegrationPlan[] = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    category: "Productivity",
    status: "planned",
    adapter: "GoogleWorkspaceAdapter",
    notes: "Gmail / Drive / Calendar hooks reserved.",
  },
  {
    id: "m365",
    name: "Microsoft 365",
    category: "Productivity",
    status: "planned",
    adapter: "Microsoft365Adapter",
    notes: "Outlook / Teams / Graph hooks reserved.",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Messaging",
    status: "planned",
    adapter: "SlackAdapter",
    notes: "Events API + chat posts reserved.",
  },
  {
    id: "teams",
    name: "Teams",
    category: "Messaging",
    status: "planned",
    adapter: "TeamsAdapter",
    notes: "Bot Framework adapter reserved.",
  },
  {
    id: "discord",
    name: "Discord",
    category: "Messaging",
    status: "planned",
    adapter: "DiscordAdapter",
    notes: "Webhook + bot adapter reserved.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    status: "planned",
    adapter: "WhatsAppBusinessAdapter",
    notes: "Meta Cloud API adapter reserved.",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    status: "planned",
    adapter: "StripeAdapter",
    notes: "Payment webhooks reserved.",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "Commerce",
    status: "planned",
    adapter: "ShopifyAdapter",
    notes: "Order / product events reserved.",
  },
  {
    id: "datev",
    name: "DATEV",
    category: "Finance",
    status: "planned",
    adapter: "DatevAdapter",
    notes: "Export / Buchungsstapel hooks reserved.",
  },
  {
    id: "sap",
    name: "SAP",
    category: "ERP",
    status: "planned",
    adapter: "SapAdapter",
    notes: "ERP event bridge reserved.",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    status: "planned",
    adapter: "HubSpotAdapter",
    notes: "CRM sync adapter reserved.",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    status: "planned",
    adapter: "SalesforceAdapter",
    notes: "Platform Events adapter reserved.",
  },
] as const;

/** Runtime contract for future action executors. */
export interface ActionExecutor {
  readonly id: string;
  execute(input: unknown): Promise<{ readonly ok: boolean; readonly output?: unknown }>;
}
