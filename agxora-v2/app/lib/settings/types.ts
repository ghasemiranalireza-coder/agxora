/**
 * AGXORA Enterprise Settings — Control Center domain types.
 * Future API ready; local state drives the UI today.
 */

export type SettingsSectionId =
  | "profile"
  | "organization"
  | "workspace"
  | "team"
  | "ai"
  | "appearance"
  | "notifications"
  | "documents"
  | "automation"
  | "integrations"
  | "security"
  | "billing"
  | "api"
  | "audit"
  | "advanced";

export interface SettingsNavItem {
  readonly id: SettingsSectionId;
  readonly label: string;
  readonly description: string;
}

export interface SettingsKpi {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly caption: string;
}

export interface TeamMemberRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly status: "active" | "invited" | "disabled";
}

export interface IntegrationRow {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly state: "installed" | "connected" | "available" | "future";
  readonly adapter: string;
}

export interface AuditLogRow {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly category: "activity" | "security" | "system";
  readonly summary: string;
}

export interface ApiKeyRow {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly createdAt: string;
  readonly lastUsed: string;
  readonly scope: string;
}

export interface AppearancePrefs {
  readonly accentColor: string;
  readonly compactMode: boolean;
  readonly density: "comfortable" | "compact" | "spacious";
  readonly animations: boolean;
  readonly glassEffects: boolean;
}

export interface NotificationPrefs {
  readonly email: boolean;
  readonly push: boolean;
  readonly desktop: boolean;
  readonly mobile: boolean;
  readonly workflowAlerts: boolean;
  readonly financeAlerts: boolean;
  readonly crmAlerts: boolean;
  readonly documentsAlerts: boolean;
}

export interface DocumentsPrefs {
  readonly storagePreference: string;
  readonly retentionPolicy: string;
  readonly defaultFolder: string;
  readonly versioning: boolean;
  readonly knowledgeIndexing: boolean;
}

export interface AutomationPrefs {
  readonly workflowDefaults: string;
  readonly aiSuggestions: boolean;
  readonly executionLogs: boolean;
  readonly historyLimit: string;
  readonly retryPolicy: string;
}
