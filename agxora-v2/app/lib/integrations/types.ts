/**
 * Canonical Integration Center types.
 *
 * Scoping (do not weaken):
 * - Credentials (OAuth tokens): organization scoped (`SocialPlatformCredential`)
 * - Connection enablement / permission flags: workspace scoped
 *   (`IntegrationConnection` unique on organizationId + workspaceId + provider)
 * - Actor is the authoritative source for org + workspace.
 *
 * Provider implementation status is NOT a connection/runtime state.
 * Connection status is NOT a provider availability state.
 */

import type { CanonicalProviderId } from "./ids";

export const PROVIDER_CATEGORIES = [
  "communication",
  "social",
  "productivity",
  "storage",
  "crm",
  "automation",
  "marketplace",
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

/**
 * Provider availability in the product — never "connected" / "healthy" /
 * "ready" / "installed". Those are runtime connection states.
 */
export const PROVIDER_IMPLEMENTATION_STATUSES = [
  "available",
  "coming_soon",
  "unsupported",
] as const;

export type ProviderImplementationStatus =
  (typeof PROVIDER_IMPLEMENTATION_STATUSES)[number];

export const CONNECTION_RUNTIME_STATUSES = [
  "not_connected",
  "pending_auth",
  "connected",
  "requires_reauth",
  "error",
  "disconnected",
] as const;

export type ConnectionRuntimeStatus =
  (typeof CONNECTION_RUNTIME_STATUSES)[number];

export const PROVIDER_UI_STATES = [
  "available",
  "connected",
  "requires_authorization",
  "requires_permission",
  "requires_reauth",
  "error",
  "unsupported",
  "coming_soon",
  "upgrade_required",
] as const;

export type ProviderUiState = (typeof PROVIDER_UI_STATES)[number];

export const PROVIDER_AUTH_METHODS = [
  "oauth2",
  "api_key",
  "webhook",
  "none",
] as const;

export type ProviderAuthMethod = (typeof PROVIDER_AUTH_METHODS)[number];

/**
 * Declarative capability vocabulary. Presence in metadata does NOT mean
 * the capability is executable.
 */
export const PROVIDER_CAPABILITIES = [
  "connect",
  "read",
  "analyze",
  "create",
  "update",
  "delete",
  "upload",
  "download",
  "sync",
  "schedule",
  "publish",
  "send",
] as const;

export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

/**
 * Future-safe plan metadata. Must NOT block production actions while there
 * is no server-side entitlement system.
 */
export const PROVIDER_PLANS = [
  "free",
  "starter",
  "professional",
  "business",
  "enterprise",
] as const;

export type ProviderPlan = (typeof PROVIDER_PLANS)[number];

export type BrandMarkId =
  | "gmail"
  | "microsoft"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x"
  | "google"
  | "slack"
  | "discord"
  | "dropbox"
  | "onedrive"
  | "google_drive"
  | "hubspot"
  | "salesforce"
  | "zapier"
  | "make"
  | "github"
  | "gitlab"
  | "amazon"
  | "shopify"
  | "ebay"
  | "alibaba"
  | "generic";

export type CanonicalProviderDefinition = {
  readonly providerId: CanonicalProviderId;
  readonly displayName: string;
  readonly category: ProviderCategory;
  readonly brandMark: BrandMarkId;
  readonly implementationStatus: ProviderImplementationStatus;
  readonly authMethod: ProviderAuthMethod;
  /** DECLARED capability metadata — not proof of execution. */
  readonly capabilities: readonly ProviderCapability[];
  /** Subset the current codebase actually implements. */
  readonly implementedCapabilities: readonly ProviderCapability[];
  readonly requiredPlan: ProviderPlan | null;
  readonly supportsConnection: boolean;
  readonly supportsMultipleAccounts: boolean;
  readonly description: string;
};

export type CapabilityLayer =
  | "declared"
  | "implemented"
  | "granted"
  | "allowed";

export type CapabilityResolution = {
  readonly declared: readonly ProviderCapability[];
  readonly implemented: readonly ProviderCapability[];
  readonly granted: readonly ProviderCapability[];
  readonly allowed: readonly ProviderCapability[];
};

export type PrimaryProviderAction =
  | "connect"
  | "configure"
  | "configure_permissions"
  | "reconnect"
  | "not_available"
  | "coming_soon"
  | "upgrade";
