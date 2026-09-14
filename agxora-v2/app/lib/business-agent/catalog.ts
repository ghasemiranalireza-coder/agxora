/**
 * Phase 70 — business-agent catalog projection.
 *
 * Provider identity and implementation status come from the canonical
 * Integration registry. This file keeps Prisma-compatible ids so existing
 * Gmail/YouTube records and Agent tools continue to work.
 */

import { SAFE_PERMISSIONS, type WorkspacePermissionFlags } from "@/app/lib/integrations/permission-flags";
import {
  projectAgentCatalog,
  type AgentCapability,
  type AgentCatalogProjection,
  type AgentImplementationStatus,
} from "@/app/lib/integrations/projections";
import { toPersistenceProviderId } from "@/app/lib/integrations/ids";

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

export type ProviderImplementationStatus = AgentImplementationStatus;

export type IntegrationCapability = AgentCapability;

export type IntegrationPermissionFlags = WorkspacePermissionFlags;

export { SAFE_PERMISSIONS };

export type IntegrationCatalogEntry = {
  readonly provider: IntegrationProviderId;
  readonly label: string;
  readonly category: "email" | "social";
  readonly implementationStatus: ProviderImplementationStatus;
  readonly capabilities: readonly IntegrationCapability[];
  readonly oauthNote: string;
};

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] =
  projectAgentCatalog().map((entry: AgentCatalogProjection) => ({
    provider: entry.provider,
    label: entry.label,
    category: entry.category,
    implementationStatus: entry.implementationStatus,
    capabilities: entry.capabilities,
    oauthNote: entry.oauthNote,
  }));

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

export function persistenceProviderFromUnknown(
  value: string,
): IntegrationProviderId | null {
  if (isIntegrationProviderId(value)) return value;
  const mapped = toPersistenceProviderId(value);
  return mapped && isIntegrationProviderId(mapped) ? mapped : null;
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
