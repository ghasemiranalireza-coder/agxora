/**
 * Detect which Marketplace providers a customer goal refers to.
 * Generic words like "listings" or "orders" do not select a provider.
 */

import {
  getMarketplaceCatalogEntry,
  MARKETPLACE_PROVIDERS,
  type MarketplaceProviderId,
} from "./marketplace-catalog";
import { marketplaceOutcomeKind, type MarketplaceOutcomeKind } from "./marketplace-contract";

const PROVIDER_PATTERNS: readonly {
  readonly provider: MarketplaceProviderId;
  readonly pattern: RegExp;
}[] = [
  { provider: "amazon_seller", pattern: /\bamazon\b|\bsp-api\b|آمازون|امازون/i },
  { provider: "shopify", pattern: /\bshopify\b/i },
  { provider: "ebay", pattern: /\bebay\b|\be-bay\b/i },
  { provider: "alibaba", pattern: /\balibaba\b/i },
];

export type MarketplaceIntentResult = {
  readonly provider: MarketplaceProviderId;
  readonly label: string;
  readonly kind: Exclude<MarketplaceOutcomeKind, "failed">;
  readonly planAccess: boolean;
  readonly connected: boolean;
  readonly canAnalyze: boolean;
  readonly missingSteps: readonly { readonly code: string; readonly message: string }[];
  readonly message: string;
};

export function detectMarketplaceProviders(goal: string): readonly MarketplaceProviderId[] {
  const found: MarketplaceProviderId[] = [];
  for (const { provider, pattern } of PROVIDER_PATTERNS) {
    if (pattern.test(goal) && !found.includes(provider)) {
      found.push(provider);
    }
  }
  return found;
}

export function describeUnsupportedMarketplaceIntent(
  provider: MarketplaceProviderId,
  planAccess: boolean,
): MarketplaceIntentResult {
  const entry = getMarketplaceCatalogEntry(provider);
  const missingSteps = [
    ...(planAccess
      ? []
      : [
          {
            code: "plan_required",
            message: `${entry.label} is part of AGXORA Premium Marketplace. This workspace does not have Marketplace access yet.`,
          },
        ]),
    {
      code: "not_implemented",
      message: entry.customerSummary,
    },
  ];
  return {
    provider,
    label: entry.label,
    kind: marketplaceOutcomeKind({ implemented: false, ready: false }),
    planAccess,
    connected: false,
    canAnalyze: false,
    missingSteps,
    message: missingSteps.map((step) => step.message).join(" "),
  };
}

export function describeAmazonMarketplaceIntent(input: {
  readonly planAccess: boolean;
  readonly connected: boolean;
  readonly canAnalyze: boolean;
  readonly missingSteps: readonly { readonly code: string; readonly message: string }[];
}): MarketplaceIntentResult {
  const entry = getMarketplaceCatalogEntry("amazon_seller");
  const kind = marketplaceOutcomeKind({
    implemented: true,
    ready: input.canAnalyze,
  });
  const message = input.canAnalyze
    ? "Amazon Seller is connected and allowed for this workspace. AGXORA can analyze the seller account after Amazon confirms the data. Price and inventory changes stay unavailable."
    : input.missingSteps[0]?.message ?? "Amazon Seller is not ready yet.";
  return {
    provider: "amazon_seller",
    label: entry.label,
    kind,
    planAccess: input.planAccess,
    connected: input.connected,
    canAnalyze: input.canAnalyze,
    missingSteps: input.missingSteps,
    message,
  };
}

export function marketplacePlanMessage(
  intents: readonly MarketplaceIntentResult[],
): string | undefined {
  if (intents.length === 0) return undefined;
  return intents.map((intent) => intent.message).join(" ");
}

export function isKnownMarketplaceProvider(value: string): value is MarketplaceProviderId {
  return (MARKETPLACE_PROVIDERS as readonly string[]).includes(value);
}
