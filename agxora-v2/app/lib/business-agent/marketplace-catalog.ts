/**
 * Future marketplace catalog. Amazon Seller is oauth_ready in Phase 3C.
 * Other marketplaces are placeholders only — no fake connections or APIs.
 */

export const MARKETPLACE_PROVIDERS = [
  "amazon_seller",
  "alibaba",
  "ebay",
  "shopify",
] as const;

export type MarketplaceProviderId = (typeof MARKETPLACE_PROVIDERS)[number];

export type MarketplaceCatalogEntry = {
  readonly provider: MarketplaceProviderId;
  readonly label: string;
  readonly tier: "premium";
  readonly category: "marketplace";
  readonly implementationStatus: "oauth_ready" | "not_implemented";
  readonly customerSummary: string;
};

export const MARKETPLACE_CATALOG: readonly MarketplaceCatalogEntry[] = [
  {
    provider: "amazon_seller",
    label: "Amazon Seller",
    tier: "premium",
    category: "marketplace",
    implementationStatus: "oauth_ready",
    customerSummary:
      "Connect your Amazon Seller account. AGXORA can then review products, inventory, and sales. Changing prices or inventory is not available yet.",
  },
  {
    provider: "alibaba",
    label: "Alibaba",
    tier: "premium",
    category: "marketplace",
    implementationStatus: "not_implemented",
    customerSummary: "Alibaba is planned for AGXORA Premium Marketplace and is not available yet.",
  },
  {
    provider: "ebay",
    label: "eBay",
    tier: "premium",
    category: "marketplace",
    implementationStatus: "not_implemented",
    customerSummary: "eBay is planned for AGXORA Premium Marketplace and is not available yet.",
  },
  {
    provider: "shopify",
    label: "Shopify",
    tier: "premium",
    category: "marketplace",
    implementationStatus: "not_implemented",
    customerSummary: "Shopify is planned for AGXORA Premium Marketplace and is not available yet.",
  },
];

export function isMarketplaceProviderId(value: unknown): value is MarketplaceProviderId {
  return (
    typeof value === "string" &&
    (MARKETPLACE_PROVIDERS as readonly string[]).includes(value)
  );
}

export function getMarketplaceCatalogEntry(
  provider: MarketplaceProviderId,
): MarketplaceCatalogEntry {
  const entry = MARKETPLACE_CATALOG.find((item) => item.provider === provider);
  if (!entry) {
    throw new Error(`unknown_marketplace:${provider}`);
  }
  return entry;
}
