import type {
  ApiKeyRow,
  AppearancePrefs,
  AuditLogRow,
  AutomationPrefs,
  DocumentsPrefs,
  IntegrationRow,
  NotificationPrefs,
  SettingsKpi,
  TeamMemberRow,
} from "./types";

export const SETTINGS_KPIS: readonly SettingsKpi[] = [
  { id: "members", label: "Team Members", value: "18", caption: "Active seats" },
  { id: "integrations", label: "Integrations", value: "6", caption: "Connected adapters" },
  { id: "api", label: "API Keys", value: "3", caption: "Developer tokens" },
  { id: "audit", label: "Audit Events", value: "124", caption: "Last 7 days" },
];

export const DEFAULT_APPEARANCE_PREFS: AppearancePrefs = {
  accentColor: "#22d3ee",
  compactMode: false,
  density: "comfortable",
  animations: true,
  glassEffects: true,
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  push: true,
  desktop: true,
  mobile: false,
  workflowAlerts: true,
  financeAlerts: true,
  crmAlerts: true,
  documentsAlerts: true,
};

export const DEFAULT_DOCUMENTS_PREFS: DocumentsPrefs = {
  storagePreference: "workspace-default",
  retentionPolicy: "7-years",
  defaultFolder: "Policies",
  versioning: true,
  knowledgeIndexing: true,
};

export const DEFAULT_AUTOMATION_PREFS: AutomationPrefs = {
  workflowDefaults: "require-approval",
  aiSuggestions: true,
  executionLogs: true,
  historyLimit: "90-days",
  retryPolicy: "3-exponential",
};

export const TEAM_MEMBERS: readonly TeamMemberRow[] = [
  { id: "m1", name: "Alex Morgan", email: "alex@agxora.io", role: "Owner", status: "active" },
  { id: "m2", name: "Sam Rivera", email: "sam@agxora.io", role: "Admin", status: "active" },
  { id: "m3", name: "Jordan Lee", email: "jordan@agxora.io", role: "Finance", status: "active" },
  { id: "m4", name: "Casey Ng", email: "casey@agxora.io", role: "Creator", status: "active" },
  { id: "m5", name: "Riley Chen", email: "riley@agxora.io", role: "Viewer", status: "invited" },
];

export const SETTINGS_INTEGRATIONS: readonly IntegrationRow[] = [
  {
    id: "i-gdrive",
    name: "Google Drive",
    category: "Documents",
    state: "connected",
    adapter: "GoogleDriveAdapter",
  },
  {
    id: "i-stripe",
    name: "Stripe",
    category: "Finance",
    state: "installed",
    adapter: "StripeAdapter",
  },
  {
    id: "i-slack",
    name: "Slack",
    category: "Communication",
    state: "available",
    adapter: "SlackAdapter",
  },
  {
    id: "i-hubspot",
    name: "HubSpot",
    category: "CRM",
    state: "available",
    adapter: "HubSpotAdapter",
  },
  {
    id: "i-sap",
    name: "SAP",
    category: "ERP",
    state: "future",
    adapter: "SapAdapter",
  },
  {
    id: "i-datev",
    name: "DATEV",
    category: "Finance",
    state: "future",
    adapter: "DatevAdapter",
  },
];

export const AUDIT_LOGS: readonly AuditLogRow[] = [
  {
    id: "a1",
    at: "2026-07-30T16:20:00Z",
    actor: "Alex Morgan",
    category: "security",
    summary: "Enabled 2FA enrollment reminder for admins",
  },
  {
    id: "a2",
    at: "2026-07-30T14:05:00Z",
    actor: "Sam Rivera",
    category: "system",
    summary: "Updated workspace default modules",
  },
  {
    id: "a3",
    at: "2026-07-29T19:40:00Z",
    actor: "Jordan Lee",
    category: "activity",
    summary: "Changed Finance alert preferences",
  },
  {
    id: "a4",
    at: "2026-07-29T11:12:00Z",
    actor: "System",
    category: "security",
    summary: "Rotated sandbox developer token prefix",
  },
  {
    id: "a5",
    at: "2026-07-28T09:00:00Z",
    actor: "Casey Ng",
    category: "activity",
    summary: "Invited Riley Chen as Viewer",
  },
];

export const API_KEYS: readonly ApiKeyRow[] = [
  {
    id: "k1",
    name: "Production Server",
    prefix: "agx_live_8f3a…",
    createdAt: "2026-05-01T10:00:00Z",
    lastUsed: "2026-07-30T12:00:00Z",
    scope: "read:write",
  },
  {
    id: "k2",
    name: "CI Pipeline",
    prefix: "agx_ci_91bc…",
    createdAt: "2026-06-12T10:00:00Z",
    lastUsed: "2026-07-29T22:10:00Z",
    scope: "read",
  },
  {
    id: "k3",
    name: "Sandbox",
    prefix: "agx_test_22de…",
    createdAt: "2026-07-01T10:00:00Z",
    lastUsed: "2026-07-28T08:00:00Z",
    scope: "sandbox",
  },
];
