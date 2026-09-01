/**
 * Phase 70 — business-agent catalog and public types.
 * Provider tokens never appear in these types.
 */

export const INTEGRATION_PROVIDERS = [
  "email_gmail",
  "email_microsoft",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
] as const;

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDERS)[number];

export type ProviderImplementationStatus =
  | "oauth_ready"
  | "not_implemented";

export type IntegrationCapability =
  | "read"
  | "create_draft"
  | "schedule"
  | "publish"
  | "send_email"
  | "delete"
  | "analytics";

export type IntegrationPermissionFlags = {
  readonly canRead: boolean;
  readonly canCreateDraft: boolean;
  readonly canSchedule: boolean;
  readonly canPublish: boolean;
  readonly canSendEmail: boolean;
  readonly canDelete: boolean;
};

export const SAFE_PERMISSIONS: IntegrationPermissionFlags = {
  canRead: true,
  canCreateDraft: true,
  canSchedule: false,
  canPublish: false,
  canSendEmail: false,
  canDelete: false,
};

export type IntegrationCatalogEntry = {
  readonly provider: IntegrationProviderId;
  readonly label: string;
  readonly category: "email" | "social";
  readonly implementationStatus: ProviderImplementationStatus;
  readonly capabilities: readonly IntegrationCapability[];
  readonly oauthNote: string;
};

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] = [
  {
    provider: "email_gmail",
    label: "Gmail / Google Workspace",
    category: "email",
    implementationStatus: "not_implemented",
    capabilities: ["read", "create_draft", "schedule", "send_email"],
    oauthNote: "Official Google OAuth will be added in Phase 2. Not connected.",
  },
  {
    provider: "email_microsoft",
    label: "Microsoft 365 / Outlook",
    category: "email",
    implementationStatus: "not_implemented",
    capabilities: ["read", "create_draft", "schedule", "send_email"],
    oauthNote: "Official Microsoft Graph OAuth is not implemented yet.",
  },
  {
    provider: "instagram",
    label: "Instagram",
    category: "social",
    implementationStatus: "not_implemented",
    capabilities: ["read", "create_draft", "schedule", "publish", "analytics"],
    oauthNote: "Official Meta OAuth is not implemented yet.",
  },
  {
    provider: "facebook",
    label: "Facebook Pages",
    category: "social",
    implementationStatus: "not_implemented",
    capabilities: ["read", "create_draft", "schedule", "publish", "analytics"],
    oauthNote: "Official Meta OAuth is not implemented yet.",
  },
  {
    provider: "tiktok",
    label: "TikTok",
    category: "social",
    implementationStatus: "not_implemented",
    capabilities: ["read", "create_draft", "schedule", "publish", "analytics"],
    oauthNote: "Official TikTok OAuth is not implemented yet.",
  },
  {
    provider: "youtube",
    label: "YouTube",
    category: "social",
    implementationStatus: "oauth_ready",
    capabilities: ["read", "create_draft", "schedule", "publish", "analytics"],
    oauthNote: "Uses the existing official Google YouTube OAuth flow.",
  },
  {
    provider: "linkedin",
    label: "LinkedIn",
    category: "social",
    implementationStatus: "not_implemented",
    capabilities: ["read", "create_draft", "schedule", "publish", "analytics"],
    oauthNote: "Official LinkedIn OAuth is not implemented yet.",
  },
  {
    provider: "x",
    label: "X",
    category: "social",
    implementationStatus: "not_implemented",
    capabilities: ["read", "create_draft", "schedule", "publish", "analytics"],
    oauthNote: "Official X OAuth is not implemented yet.",
  },
];

export function isIntegrationProviderId(
  value: unknown,
): value is IntegrationProviderId {
  return (
    typeof value === "string" &&
    (INTEGRATION_PROVIDERS as readonly string[]).includes(value)
  );
}

export function getCatalogEntry(
  provider: IntegrationProviderId,
): IntegrationCatalogEntry {
  const entry = INTEGRATION_CATALOG.find((item) => item.provider === provider);
  if (!entry) {
    throw new Error(`unknown_provider:${provider}`);
  }
  return entry;
}

export const AGENT_PLAN_STEPS = [
  "analyze_business_context",
  "analyze_connected_channels",
  "build_campaign_strategy",
  "generate_content",
  "create_drafts",
  "wait_for_approval",
  "publish_approved_content",
  "verify_publication",
  "report_results",
] as const;
