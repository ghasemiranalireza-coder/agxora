/**
 * Module-specific projections of the canonical provider registry.
 *
 * Keep extra metadata (protocols, adapters, notes) here. Do not duplicate
 * provider identity or implementation status in other catalogs.
 */

import {
  toCanonicalProviderId,
  type CanonicalProviderId,
  type PersistenceProviderId,
} from "./ids";
import { getProviderDefinition, PROVIDER_REGISTRY } from "./registry";
import { toLegacyCapability } from "./capabilities";
import type {
  CanonicalProviderDefinition,
  ProviderAuthMethod,
  ProviderImplementationStatus,
} from "./types";

export type AgentCatalogCategory = "email" | "social";
export type AgentImplementationStatus = "oauth_ready" | "not_implemented";
export type AgentCapability =
  | "read"
  | "create_draft"
  | "schedule"
  | "publish"
  | "send_email"
  | "delete"
  | "analytics";

export type AgentCatalogProjection = {
  readonly provider: PersistenceProviderId;
  readonly canonicalProviderId: CanonicalProviderId;
  readonly label: string;
  readonly category: AgentCatalogCategory;
  readonly implementationStatus: AgentImplementationStatus;
  readonly capabilities: readonly AgentCapability[];
  readonly oauthNote: string;
};

const AGENT_PROVIDER_ORDER: readonly PersistenceProviderId[] = [
  "email_gmail",
  "email_microsoft",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
];

export function toAgentImplementationStatus(
  status: ProviderImplementationStatus,
): AgentImplementationStatus {
  return status === "available" ? "oauth_ready" : "not_implemented";
}

export function projectAgentCatalog(): readonly AgentCatalogProjection[] {
  return AGENT_PROVIDER_ORDER.map((provider) => {
    const canonical = toCanonicalProviderId(provider);
    if (!canonical) {
      throw new Error(`unmapped_persistence_provider:${provider}`);
    }
    const entry = getProviderDefinition(canonical);
    const capabilities = entry.capabilities
      .map(toLegacyCapability)
      .filter((item): item is AgentCapability => item != null);
    return {
      provider,
      canonicalProviderId: canonical,
      label:
        provider === "email_gmail"
          ? "Gmail / Google Workspace"
          : entry.displayName,
      category: entry.category === "communication" ? "email" : "social",
      implementationStatus: toAgentImplementationStatus(entry.implementationStatus),
      capabilities,
      oauthNote: entry.description,
    };
  });
}

type ConnectorExtras = {
  readonly oauthProvider?:
    | "google"
    | "microsoft"
    | "github"
    | "slack"
    | "dropbox"
    | "custom";
  readonly protocols: readonly (
    | "rest"
    | "graphql"
    | "websocket"
    | "webhook"
    | "grpc"
  )[];
  readonly eventTypes: readonly string[];
  readonly scopes: readonly string[];
};

const CONNECTOR_EXTRAS: Readonly<Record<string, ConnectorExtras>> = {
  microsoft365: {
    oauthProvider: "microsoft",
    protocols: ["rest", "webhook"],
    eventTypes: ["mail.received", "calendar.event", "teams.message"],
    scopes: ["Mail.Read", "Calendars.Read", "User.Read"],
  },
  google_workspace: {
    oauthProvider: "google",
    protocols: ["rest", "webhook"],
    eventTypes: ["mail.received", "calendar.event", "drive.file"],
    scopes: ["gmail.readonly", "calendar.readonly", "drive.readonly"],
  },
  slack: {
    oauthProvider: "slack",
    protocols: ["rest", "webhook", "websocket"],
    eventTypes: ["message.posted", "channel.created", "app.mention"],
    scopes: ["chat:write", "channels:read"],
  },
  discord: {
    oauthProvider: "custom",
    protocols: ["rest", "webhook"],
    eventTypes: ["message.create", "guild.member"],
    scopes: ["bot", "webhook.incoming"],
  },
  dropbox: {
    oauthProvider: "dropbox",
    protocols: ["rest", "webhook"],
    eventTypes: ["file.uploaded", "file.deleted"],
    scopes: ["files.content.read", "files.content.write"],
  },
  onedrive: {
    oauthProvider: "microsoft",
    protocols: ["rest", "webhook"],
    eventTypes: ["file.uploaded", "file.updated"],
    scopes: ["Files.ReadWrite"],
  },
  google_drive: {
    oauthProvider: "google",
    protocols: ["rest", "webhook"],
    eventTypes: ["file.uploaded", "file.shared"],
    scopes: ["drive.readonly", "drive.file"],
  },
  hubspot: {
    oauthProvider: "custom",
    protocols: ["rest", "webhook"],
    eventTypes: ["contact.created", "deal.updated"],
    scopes: ["crm.objects.contacts.read", "crm.objects.deals.read"],
  },
  salesforce: {
    oauthProvider: "custom",
    protocols: ["rest", "graphql", "webhook"],
    eventTypes: ["account.created", "opportunity.updated"],
    scopes: ["api", "refresh_token"],
  },
  zapier: {
    protocols: ["webhook", "rest"],
    eventTypes: ["zap.trigger", "zap.complete"],
    scopes: ["hooks:write"],
  },
  make: {
    protocols: ["webhook", "rest"],
    eventTypes: ["scenario.run", "scenario.error"],
    scopes: ["scenarios:trigger"],
  },
  github: {
    oauthProvider: "github",
    protocols: ["rest", "webhook", "graphql"],
    eventTypes: ["push", "pull_request", "issues"],
    scopes: ["repo", "read:org"],
  },
  gitlab: {
    oauthProvider: "custom",
    protocols: ["rest", "webhook"],
    eventTypes: ["push", "merge_request", "pipeline"],
    scopes: ["api", "read_repository"],
  },
  custom: {
    oauthProvider: "custom",
    protocols: ["rest", "webhook", "graphql", "grpc"],
    eventTypes: ["custom.event"],
    scopes: ["custom:*"],
  },
};

export const CONNECTOR_PROVIDER_IDS = [
  "microsoft365",
  "google_workspace",
  "slack",
  "discord",
  "dropbox",
  "onedrive",
  "google_drive",
  "hubspot",
  "salesforce",
  "zapier",
  "make",
  "github",
  "gitlab",
  "custom",
] as const;

export type ConnectorProjectionId = (typeof CONNECTOR_PROVIDER_IDS)[number];

export type ConnectorCatalogProjection = {
  readonly id: ConnectorProjectionId;
  readonly name: string;
  readonly description: string;
  readonly category:
    | "productivity"
    | "communication"
    | "storage"
    | "crm"
    | "automation"
    | "devtools"
    | "custom";
  readonly authMethod: ProviderAuthMethod;
  readonly oauthProvider?: ConnectorExtras["oauthProvider"];
  readonly protocols: ConnectorExtras["protocols"];
  readonly eventTypes: readonly string[];
  readonly scopes: readonly string[];
};

function connectorCategoryFromCanonical(
  category: CanonicalProviderDefinition["category"],
): ConnectorCatalogProjection["category"] {
  switch (category) {
    case "communication":
    case "productivity":
    case "storage":
    case "crm":
    case "automation":
      return category;
    default:
      return "custom";
  }
}

export function projectConnectorCatalog(): readonly ConnectorCatalogProjection[] {
  return CONNECTOR_PROVIDER_IDS.map((id) => {
    const canonical = toCanonicalProviderId(id);
    if (!canonical) {
      throw new Error(`unmapped_connector:${id}`);
    }
    const entry = getProviderDefinition(canonical);
    const extras = CONNECTOR_EXTRAS[id];
    if (!extras) {
      throw new Error(`missing_connector_extras:${id}`);
    }
    return {
      id,
      name: entry.displayName,
      description: entry.description,
      category: connectorCategoryFromCanonical(entry.category),
      authMethod: entry.authMethod,
      oauthProvider: extras.oauthProvider,
      protocols: extras.protocols,
      eventTypes: extras.eventTypes,
      scopes: extras.scopes,
    };
  });
}

/**
 * Module catalogs keep their own status unions. Never upgrade a row to a
 * status the module vocabulary does not use. Canonical implementationStatus
 * remains the authority in the Integration Center.
 */
export function moduleStatusFromCanonical<
  T extends "planned" | "coming_soon" | "disabled" | "ready",
>(providerId: string, fallback: T): T {
  const canonical = toCanonicalProviderId(providerId);
  if (!canonical) return fallback;
  void getProviderDefinition(canonical).implementationStatus;
  return fallback;
}

export function overlappingCanonicalIds(): readonly CanonicalProviderId[] {
  return PROVIDER_REGISTRY.map((entry) => entry.providerId);
}
