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
import { getProviderDefinition } from "@/app/lib/integrations/registry";
import { toCanonicalProviderId } from "@/app/lib/integrations/ids";

function settingsStateFor(providerId: string): IntegrationRow["state"] {
  const canonical = toCanonicalProviderId(providerId);
  if (!canonical) return "future";
  const status = getProviderDefinition(canonical).implementationStatus;
  if (status === "available") return "available";
  return "future";
}

// Prototype layout only — counts are honest empty until live settings APIs exist.
export const SETTINGS_DATA_SOURCE = "demo-prototype" as const;

/** Prototype metrics — never render these as live tenant totals. */
export const SETTINGS_KPI_EMPTY_VALUE = "—" as const;

export const SETTINGS_KPIS: readonly SettingsKpi[] = [
  { id: "members", label: "Team Members", value: SETTINGS_KPI_EMPTY_VALUE, caption: "No data available yet" },
  { id: "integrations", label: "Integrations", value: SETTINGS_KPI_EMPTY_VALUE, caption: "Connect a provider to unlock this insight." },
  { id: "api", label: "API Keys", value: SETTINGS_KPI_EMPTY_VALUE, caption: "No data available yet" },
  { id: "audit", label: "Audit Events", value: SETTINGS_KPI_EMPTY_VALUE, caption: "No data available yet" },
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
  { id: "m1", name: "Demo · Alex Morgan", email: "demo.alex@example.invalid", role: "Owner", status: "active" },
  { id: "m2", name: "Demo · Sam Rivera", email: "demo.sam@example.invalid", role: "Admin", status: "active" },
  { id: "m3", name: "Demo · Jordan Lee", email: "demo.jordan@example.invalid", role: "Finance", status: "active" },
  { id: "m4", name: "Demo · Casey Ng", email: "demo.casey@example.invalid", role: "Creator", status: "active" },
  { id: "m5", name: "Demo · Riley Chen", email: "demo.riley@example.invalid", role: "Viewer", status: "invited" },
];

// Honesty rule: this prototype table is not live tenant connection state.
// Gmail/YouTube may show implementation "available". Never "connected".
export const SETTINGS_INTEGRATIONS: readonly IntegrationRow[] = [
  {
    id: "i-gmail",
    providerId: "gmail",
    name: "Gmail",
    category: "Communication",
    state: settingsStateFor("gmail"),
    adapter: "GmailAdapter",
  },
  {
    id: "i-youtube",
    providerId: "youtube",
    name: "YouTube",
    category: "Social",
    state: settingsStateFor("youtube"),
    adapter: "YouTubeAdapter",
  },
  {
    id: "i-gdrive",
    providerId: "google_drive",
    name: "Google Drive",
    category: "Documents",
    state: settingsStateFor("google_drive"),
    adapter: "GoogleDriveAdapter",
  },
  {
    id: "i-stripe",
    name: "Stripe",
    category: "Finance",
    state: "future",
    adapter: "StripeAdapter",
  },
  {
    id: "i-slack",
    providerId: "slack",
    name: "Slack",
    category: "Communication",
    state: settingsStateFor("slack"),
    adapter: "SlackAdapter",
  },
  {
    id: "i-hubspot",
    providerId: "hubspot",
    name: "HubSpot",
    category: "CRM",
    state: settingsStateFor("hubspot"),
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
    actor: "Demo · Alex Morgan",
    category: "security",
    summary: "Demo sample: Enabled 2FA enrollment reminder for admins",
  },
  {
    id: "a2",
    at: "2026-07-30T14:05:00Z",
    actor: "Demo · Sam Rivera",
    category: "system",
    summary: "Demo sample: Updated workspace default modules",
  },
  {
    id: "a3",
    at: "2026-07-29T19:40:00Z",
    actor: "Demo · Jordan Lee",
    category: "activity",
    summary: "Demo sample: Changed Finance alert preferences",
  },
  {
    id: "a4",
    at: "2026-07-29T11:12:00Z",
    actor: "Demo · System",
    category: "security",
    summary: "Demo sample: Rotated sandbox developer token prefix",
  },
  {
    id: "a5",
    at: "2026-07-28T09:00:00Z",
    actor: "Demo · Casey Ng",
    category: "activity",
    summary: "Demo sample: Invited Riley Chen as Viewer",
  },
];

export const API_KEYS: readonly ApiKeyRow[] = [
  {
    id: "k1",
    name: "Demo · Production Server (not a live key)",
    prefix: "demo_not_live_8f3a…",
    createdAt: "2026-05-01T10:00:00Z",
    lastUsed: "2026-07-30T12:00:00Z",
    scope: "read:write",
  },
  {
    id: "k2",
    name: "Demo · CI Pipeline (not a live key)",
    prefix: "demo_not_live_91bc…",
    createdAt: "2026-06-12T10:00:00Z",
    lastUsed: "2026-07-29T22:10:00Z",
    scope: "read",
  },
  {
    id: "k3",
    name: "Demo · Sandbox (not a live key)",
    prefix: "demo_not_live_22de…",
    createdAt: "2026-07-01T10:00:00Z",
    lastUsed: "2026-07-28T08:00:00Z",
    scope: "sandbox",
  },
];
