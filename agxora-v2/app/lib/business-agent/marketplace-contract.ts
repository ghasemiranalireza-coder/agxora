/**
 * Provider-agnostic Marketplace contract.
 * Amazon is the only implemented provider. Others stay catalog-only.
 * This is not an SDK and does not invent provider methods.
 */

import {
  MARKETPLACE_CATALOG,
  type MarketplaceProviderId,
} from "./marketplace-catalog";

export const MARKETPLACE_OUTCOME_KINDS = [
  "ok",
  "unsupported",
  "human_required",
  "failed",
] as const;

export type MarketplaceOutcomeKind = (typeof MARKETPLACE_OUTCOME_KINDS)[number];

export const MARKETPLACE_OPERATIONS = [
  "connect",
  "disconnect",
  "discover_accounts",
  "discover_marketplaces",
  "list_products",
  "list_orders",
  "list_inventory",
  "list_sales",
  "analyze",
  "mutate_price",
  "mutate_inventory",
  "mutate_listing",
  "webhooks",
  "schedule",
] as const;

export type MarketplaceOperation = (typeof MARKETPLACE_OPERATIONS)[number];

const AMAZON_IMPLEMENTED_OPERATIONS = new Set<MarketplaceOperation>([
  "connect",
  "disconnect",
  "discover_accounts",
  "discover_marketplaces",
  "list_products",
  "list_orders",
  "list_inventory",
  "list_sales",
  "analyze",
]);

export function marketplaceOperationStatus(
  provider: MarketplaceProviderId,
  operation: MarketplaceOperation,
): "ok" | "unsupported" {
  const entry = MARKETPLACE_CATALOG.find((item) => item.provider === provider);
  if (!entry || entry.implementationStatus !== "oauth_ready") {
    return "unsupported";
  }
  if (provider !== "amazon_seller") return "unsupported";
  return AMAZON_IMPLEMENTED_OPERATIONS.has(operation) ? "ok" : "unsupported";
}

export function marketplaceOutcomeKind(input: {
  readonly implemented: boolean;
  readonly ready: boolean;
}): Exclude<MarketplaceOutcomeKind, "failed"> {
  if (!input.implemented) return "unsupported";
  if (!input.ready) return "human_required";
  return "ok";
}
