/**
 * Canonical provider registry — the single source of provider identity.
 *
 * Server-authoritative: connection/runtime state is resolved on the server.
 * This file is pure metadata and is safe to import from client components.
 *
 * Gmail and YouTube are the only `available` production customer integrations
 * on current main. Every other provider is architecture only.
 */

import { CANONICAL_PROVIDER_IDS, type CanonicalProviderId } from "./ids";
import type {
  CanonicalProviderDefinition,
  ProviderCategory,
  ProviderImplementationStatus,
} from "./types";

function def(
  entry: CanonicalProviderDefinition,
): CanonicalProviderDefinition {
  return entry;
}

export const PROVIDER_REGISTRY: readonly CanonicalProviderDefinition[] = [
  def({
    providerId: "gmail",
    displayName: "Gmail",
    category: "communication",
    brandMark: "gmail",
    implementationStatus: "available",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "schedule", "send"],
    implementedCapabilities: ["connect", "read", "create", "send"],
    requiredPlan: null,
    supportsConnection: true,
    supportsMultipleAccounts: false,
    description:
      "Uses official Google OAuth. Read and draft are allowed by default. Sending stays off until you enable it and approve the action.",
  }),
  def({
    providerId: "microsoft365",
    displayName: "Microsoft 365 / Outlook",
    category: "communication",
    brandMark: "microsoft",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "schedule", "send"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Microsoft Graph OAuth is not implemented yet.",
  }),
  def({
    providerId: "youtube",
    displayName: "YouTube",
    category: "social",
    brandMark: "youtube",
    implementationStatus: "available",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "publish"],
    implementedCapabilities: ["connect", "read", "create", "publish"],
    requiredPlan: null,
    supportsConnection: true,
    supportsMultipleAccounts: false,
    description:
      "Uses official Google YouTube OAuth. Video publish uses the existing resumable upload pipeline after approval. Publish permission stays off by default. Scheduling via publishAt and YouTube Analytics are not implemented.",
  }),
  def({
    providerId: "linkedin",
    displayName: "LinkedIn",
    category: "social",
    brandMark: "linkedin",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "schedule", "publish", "analyze"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official LinkedIn OAuth is not implemented yet.",
  }),
  def({
    providerId: "instagram",
    displayName: "Instagram",
    category: "social",
    brandMark: "instagram",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "schedule", "publish", "analyze"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Meta OAuth is not implemented yet.",
  }),
  def({
    providerId: "facebook",
    displayName: "Facebook Pages",
    category: "social",
    brandMark: "facebook",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "schedule", "publish", "analyze"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Meta OAuth is not implemented yet.",
  }),
  def({
    providerId: "tiktok",
    displayName: "TikTok",
    category: "social",
    brandMark: "tiktok",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "schedule", "publish", "analyze"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official TikTok OAuth is not implemented yet.",
  }),
  def({
    providerId: "x",
    displayName: "X",
    category: "social",
    brandMark: "x",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "schedule", "publish", "analyze"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official X OAuth is not implemented yet.",
  }),
  def({
    providerId: "google_calendar",
    displayName: "Google Calendar",
    category: "productivity",
    brandMark: "google",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "update", "delete", "schedule"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Google Calendar OAuth is not implemented yet.",
  }),
  def({
    providerId: "google_workspace",
    displayName: "Google Workspace",
    category: "productivity",
    brandMark: "google",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "sync"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description:
      "Workspace tenant administration is reserved. Gmail is a separate communication provider.",
  }),
  def({
    providerId: "google_drive",
    displayName: "Google Drive",
    category: "storage",
    brandMark: "google_drive",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "upload", "download", "sync"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Google Drive OAuth is not implemented yet.",
  }),
  def({
    providerId: "dropbox",
    displayName: "Dropbox",
    category: "storage",
    brandMark: "dropbox",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "upload", "download", "sync"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Dropbox OAuth is not implemented yet.",
  }),
  def({
    providerId: "onedrive",
    displayName: "OneDrive",
    category: "storage",
    brandMark: "onedrive",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "upload", "download", "sync"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Microsoft Graph OneDrive OAuth is not implemented yet.",
  }),
  def({
    providerId: "hubspot",
    displayName: "HubSpot",
    category: "crm",
    brandMark: "hubspot",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "update", "sync"],
    implementedCapabilities: [],
    requiredPlan: "professional",
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official HubSpot OAuth is not implemented yet.",
  }),
  def({
    providerId: "salesforce",
    displayName: "Salesforce",
    category: "crm",
    brandMark: "salesforce",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create", "update", "sync"],
    implementedCapabilities: [],
    requiredPlan: "business",
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Salesforce OAuth is not implemented yet.",
  }),
  def({
    providerId: "slack",
    displayName: "Slack",
    category: "automation",
    brandMark: "slack",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "send"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Slack OAuth is not implemented yet.",
  }),
  def({
    providerId: "discord",
    displayName: "Discord",
    category: "automation",
    brandMark: "discord",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "send"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official Discord OAuth is not implemented yet.",
  }),
  def({
    providerId: "zapier",
    displayName: "Zapier",
    category: "automation",
    brandMark: "zapier",
    implementationStatus: "coming_soon",
    authMethod: "api_key",
    capabilities: ["connect", "send"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Zapier hooks are reserved. No live Zapier backend in this build.",
  }),
  def({
    providerId: "make",
    displayName: "Make",
    category: "automation",
    brandMark: "make",
    implementationStatus: "coming_soon",
    authMethod: "webhook",
    capabilities: ["connect", "send"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Make scenario webhooks are reserved. No live Make backend in this build.",
  }),
  def({
    providerId: "github",
    displayName: "GitHub",
    category: "automation",
    brandMark: "github",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official GitHub OAuth is not implemented yet.",
  }),
  def({
    providerId: "gitlab",
    displayName: "GitLab",
    category: "automation",
    brandMark: "gitlab",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "create"],
    implementedCapabilities: [],
    requiredPlan: null,
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Official GitLab OAuth is not implemented yet.",
  }),
  def({
    providerId: "custom",
    displayName: "Custom Connector",
    category: "automation",
    brandMark: "generic",
    implementationStatus: "coming_soon",
    authMethod: "api_key",
    capabilities: ["connect"],
    implementedCapabilities: [],
    requiredPlan: "enterprise",
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Extension point for proprietary systems. Not implemented.",
  }),
  def({
    providerId: "amazon_seller",
    displayName: "Amazon Seller",
    category: "marketplace",
    brandMark: "amazon",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "sync"],
    implementedCapabilities: [],
    requiredPlan: "business",
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Amazon Seller is not implemented on current main.",
  }),
  def({
    providerId: "shopify",
    displayName: "Shopify",
    category: "marketplace",
    brandMark: "shopify",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "sync"],
    implementedCapabilities: [],
    requiredPlan: "professional",
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Shopify OAuth is not implemented on current main.",
  }),
  def({
    providerId: "ebay",
    displayName: "eBay",
    category: "marketplace",
    brandMark: "ebay",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "sync"],
    implementedCapabilities: [],
    requiredPlan: "professional",
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "eBay is not implemented on current main.",
  }),
  def({
    providerId: "alibaba",
    displayName: "Alibaba",
    category: "marketplace",
    brandMark: "alibaba",
    implementationStatus: "coming_soon",
    authMethod: "oauth2",
    capabilities: ["connect", "read", "sync"],
    implementedCapabilities: [],
    requiredPlan: "professional",
    supportsConnection: false,
    supportsMultipleAccounts: false,
    description: "Alibaba is not implemented on current main.",
  }),
] as const;

const BY_ID = new Map(
  PROVIDER_REGISTRY.map((entry) => [entry.providerId, entry]),
);

export function getProviderDefinition(
  providerId: CanonicalProviderId,
): CanonicalProviderDefinition {
  const entry = BY_ID.get(providerId);
  if (!entry) {
    throw new Error(`unknown_canonical_provider:${providerId}`);
  }
  return entry;
}

export function listProviderDefinitions(
  category?: ProviderCategory,
): readonly CanonicalProviderDefinition[] {
  if (!category) return PROVIDER_REGISTRY;
  return PROVIDER_REGISTRY.filter((entry) => entry.category === category);
}

export function listAvailableProviders(): readonly CanonicalProviderDefinition[] {
  return PROVIDER_REGISTRY.filter(
    (entry) => entry.implementationStatus === "available",
  );
}

export function isImplementedProvider(providerId: CanonicalProviderId): boolean {
  return getProviderDefinition(providerId).implementationStatus === "available";
}

export function implementationStatusOf(
  providerId: CanonicalProviderId,
): ProviderImplementationStatus {
  return getProviderDefinition(providerId).implementationStatus;
}

export function assertRegistryCoversCanonicalIds(): void {
  if (PROVIDER_REGISTRY.length !== CANONICAL_PROVIDER_IDS.length) {
    throw new Error("canonical_registry_incomplete");
  }
}
