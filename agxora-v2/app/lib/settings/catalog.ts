import type { SettingsNavItem } from "./types";

export const SETTINGS_NAV: readonly SettingsNavItem[] = [
  { id: "profile", label: "Profile", description: "Avatar, identity, and personal preferences" },
  { id: "organization", label: "Organization", description: "Company profile and tax identity" },
  { id: "workspace", label: "Workspace", description: "Branding, homepage, and default modules" },
  { id: "team", label: "Team", description: "Members, roles, invitations, and groups" },
  { id: "ai", label: "AI", description: "Provider, model, creativity, and memory" },
  { id: "appearance", label: "Appearance", description: "Theme, density, and glass effects" },
  { id: "notifications", label: "Notifications", description: "Email, push, and module alerts" },
  { id: "documents", label: "Documents", description: "Storage, retention, and knowledge" },
  { id: "automation", label: "Automation", description: "Workflow defaults and retry policy" },
  { id: "integrations", label: "Integrations", description: "Installed, connected, and available" },
  { id: "security", label: "Security", description: "2FA, sessions, keys, and encryption" },
  { id: "billing", label: "Billing", description: "Plan, usage, invoices, and payments" },
  { id: "api", label: "API & Developers", description: "Keys, webhooks, tokens, sandbox" },
  { id: "audit", label: "Audit Logs", description: "Activity, security, and system changes" },
  { id: "advanced", label: "Advanced", description: "Experimental, reset, import, export" },
] as const;

export const ACCENT_SWATCHES = [
  { id: "cyan", label: "Cyan", value: "#22d3ee" },
  { id: "blue", label: "Blue", value: "#60a5fa" },
  { id: "emerald", label: "Emerald", value: "#34d399" },
  { id: "violet", label: "Violet", value: "#a78bfa" },
  { id: "amber", label: "Amber", value: "#fbbf24" },
] as const;
