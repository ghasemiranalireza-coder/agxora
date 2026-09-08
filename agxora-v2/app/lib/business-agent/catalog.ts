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
  "amazon_seller",
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
  readonly category: "email" | "social" | "commerce";
  readonly implementationStatus: ProviderImplementationStatus;
  readonly capabilities: readonly IntegrationCapability[];
  readonly oauthNote: string;
};

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] = [
  {
    provider: "email_gmail",
    label: "Gmail / Google Workspace",
    category: "email",
    implementationStatus: "oauth_ready",
    capabilities: ["read", "create_draft", "schedule", "send_email"],
    oauthNote:
      "Uses official Google OAuth. Read and draft are allowed by default. Sending stays off until you enable it and approve the action.",
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
    capabilities: ["read", "create_draft", "publish"],
    oauthNote:
      "Uses official Google YouTube OAuth. Video publish uses the existing resumable upload pipeline after approval. Publish permission stays off by default. Scheduling via publishAt and YouTube Analytics are not implemented.",
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
  {
    provider: "amazon_seller",
    label: "Amazon Seller",
    category: "commerce",
    implementationStatus: "oauth_ready",
    capabilities: ["read", "analytics"],
    oauthNote:
      "Uses official Amazon Selling Partner API (Login with Amazon). Seller authorization, marketplace discovery, listings, inventory, non-PII orders, pricing, and sales metrics are read-only. Price/inventory/listing writes, order changes, refunds, reports, and Amazon Ads are not implemented.",
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
