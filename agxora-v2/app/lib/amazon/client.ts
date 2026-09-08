/**
 * Phase 3C — official Amazon SP-API seller reads. Never invent listings, orders, or inventory.
 * Write operations return unsupported. Buyer PII is stripped even if Amazon returns it.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getValidSocialAccessTokenForActor, getSocialCredentialSummary } from "@/app/lib/social/credentials";
import { AMAZON_USER_AGENT, getAmazonLwaConfig, isAmazonSellerEnabled } from "./config";

export type AmazonHttp = {
  readonly fetch: typeof fetch;
};

let httpOverride: AmazonHttp | null = null;

export function setAmazonSpApiHttpForTests(http: AmazonHttp | null): void {
  httpOverride = http;
}

function amazonFetch(): typeof fetch {
  return httpOverride?.fetch ?? fetch;
}

export type AmazonFailed = {
  readonly kind: "failed";
  readonly reason: string;
};

export type AmazonUnsupported = {
  readonly kind: "unsupported";
  readonly reason: string;
};

export type AmazonMarketplace = {
  readonly marketplaceId: string;
  readonly countryCode?: string;
  readonly name?: string;
  readonly defaultCurrencyCode?: string;
  readonly defaultLanguageCode?: string;
  readonly domainName?: string;
  readonly participation?: { readonly isParticipating?: boolean; readonly hasSuspendedListings?: boolean };
};

export type AmazonListingSummary = {
  readonly sku?: string;
  readonly asin?: string;
  readonly status?: readonly string[];
  readonly itemName?: string;
  readonly issues?: readonly { readonly code?: string; readonly message?: string; readonly severity?: string }[];
};

export type AmazonInventoryRow = {
  readonly asin?: string;
  readonly sellerSku?: string;
  readonly fnSku?: string;
  readonly totalQuantity?: number;
  readonly fulfillableQuantity?: number;
  readonly inboundWorkingQuantity?: number;
  readonly inboundShippedQuantity?: number;
  readonly inboundReceivingQuantity?: number;
};

export type AmazonOrderSummary = {
  readonly amazonOrderId: string;
  readonly purchaseDate?: string;
  readonly orderStatus?: string;
  readonly fulfillmentChannel?: string;
  readonly salesChannel?: string;
  readonly marketplaceId?: string;
  readonly numberOfItemsShipped?: number;
  readonly numberOfItemsUnshipped?: number;
  readonly orderTotal?: { readonly currencyCode?: string; readonly amount?: string };
  readonly isPrime?: boolean;
  readonly isBusinessOrder?: boolean;
};

export type AmazonSalesMetric = {
  readonly interval?: string;
  readonly unitCount?: number;
  readonly orderCount?: number;
  readonly orderItemCount?: number;
  readonly averageUnitPrice?: { readonly currencyCode?: string; readonly amount?: number };
  readonly totalSales?: { readonly currencyCode?: string; readonly amount?: number };
};

export type AmazonPriceRow = {
  readonly status?: string;
  readonly asin?: string;
  readonly sellerSKU?: string;
  readonly listingPrice?: { readonly currencyCode?: string; readonly amount?: number };
};

const ORDER_PII_KEYS = new Set([
  "BuyerInfo",
  "ShippingAddress",
  "BuyerTaxInfo",
  "AutomatedShippingSettings",
  "BuyerEmail",
  "BuyerName",
  "ShippingAddressName",
]);

function stripOrderPii(order: Record<string, unknown>): AmazonOrderSummary {
  const amazonOrderId = typeof order.AmazonOrderId === "string" ? order.AmazonOrderId : "";
  const orderTotal = order.OrderTotal as { CurrencyCode?: string; Amount?: string } | undefined;
  return {
    amazonOrderId,
    purchaseDate: typeof order.PurchaseDate === "string" ? order.PurchaseDate : undefined,
    orderStatus: typeof order.OrderStatus === "string" ? order.OrderStatus : undefined,
    fulfillmentChannel: typeof order.FulfillmentChannel === "string" ? order.FulfillmentChannel : undefined,
    salesChannel: typeof order.SalesChannel === "string" ? order.SalesChannel : undefined,
    marketplaceId: typeof order.MarketplaceId === "string" ? order.MarketplaceId : undefined,
    numberOfItemsShipped:
      typeof order.NumberOfItemsShipped === "number" ? order.NumberOfItemsShipped : undefined,
    numberOfItemsUnshipped:
      typeof order.NumberOfItemsUnshipped === "number" ? order.NumberOfItemsUnshipped : undefined,
    orderTotal: orderTotal
      ? { currencyCode: orderTotal.CurrencyCode, amount: orderTotal.Amount }
      : undefined,
    isPrime: typeof order.IsPrime === "boolean" ? order.IsPrime : undefined,
    isBusinessOrder: typeof order.IsBusinessOrder === "boolean" ? order.IsBusinessOrder : undefined,
  };
}

function assertNoPii(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  for (const key of ORDER_PII_KEYS) {
    if (serialized.includes(`"${key}"`)) {
      throw new PersistenceError("validation", "Refusing to return Amazon buyer PII");
    }
  }
}

async function requireAccess(actor: Actor): Promise<{
  token: string;
  sellerId: string;
  endpoint: string;
}> {
  if (!isAmazonSellerEnabled() && process.env.NODE_ENV !== "test") {
    throw new PersistenceError("misconfigured", "Amazon Seller is disabled");
  }
  const config = getAmazonLwaConfig();
  if (!config && process.env.NODE_ENV !== "test") {
    throw new PersistenceError("misconfigured", "Amazon Seller OAuth is not configured");
  }
  const token = await getValidSocialAccessTokenForActor(actor, "amazon");
  if (!token) {
    throw new PersistenceError("forbidden", "Amazon Seller is not connected");
  }
  const summary = await getSocialCredentialSummary(actor.organizationId, "amazon");
  const sellerId = summary?.externalAccountId?.trim();
  if (!sellerId) {
    throw new PersistenceError("forbidden", "Amazon selling partner id is missing");
  }
  return {
    token,
    sellerId,
    endpoint: config?.spApiEndpoint ?? "https://sellingpartnerapi-na.amazon.com",
  };
}

async function spApiGet(
  endpoint: string,
  token: string,
  path: string,
  query?: Record<string, string | undefined>,
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  const url = new URL(path, endpoint);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  const response = await amazonFetch()(url.toString(), {
    headers: {
      accept: "application/json",
      "user-agent": AMAZON_USER_AGENT,
      "x-amz-access-token": token,
    },
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { ok: response.ok, status: response.status, payload };
}

export async function listAmazonMarketplacesForActor(
  actor: Actor,
): Promise<{ readonly marketplaces: readonly AmazonMarketplace[] } | AmazonFailed> {
  const access = await requireAccess(actor);
  const result = await spApiGet(
    access.endpoint,
    access.token,
    "/sellers/v1/marketplaceParticipations",
  );
  if (!result.ok) {
    return { kind: "failed", reason: "amazon_marketplace_read_failed" };
  }
  const payload = result.payload as {
    payload?: readonly {
      marketplace?: {
        id?: string;
        countryCode?: string;
        name?: string;
        defaultCurrencyCode?: string;
        defaultLanguageCode?: string;
        domainName?: string;
      };
      participation?: { isParticipating?: boolean; hasSuspendedListings?: boolean };
    }[];
  };
  const marketplaces: AmazonMarketplace[] = [];
  for (const row of payload.payload ?? []) {
    const id = row.marketplace?.id?.trim();
    if (!id) continue;
    marketplaces.push({
      marketplaceId: id,
      countryCode: row.marketplace?.countryCode,
      name: row.marketplace?.name,
      defaultCurrencyCode: row.marketplace?.defaultCurrencyCode,
      defaultLanguageCode: row.marketplace?.defaultLanguageCode,
      domainName: row.marketplace?.domainName,
      participation: row.participation,
    });
  }
  return { marketplaces };
}

export async function listAmazonListingsForActor(
  actor: Actor,
  input: { readonly marketplaceId: string; readonly pageSize?: number },
): Promise<{ readonly listings: readonly AmazonListingSummary[] } | AmazonFailed> {
  const access = await requireAccess(actor);
  const result = await spApiGet(
    access.endpoint,
    access.token,
    `/listings/2021-08-01/items/${encodeURIComponent(access.sellerId)}`,
    {
      marketplaceIds: input.marketplaceId,
      includedData: "summaries,issues,fulfillmentAvailability",
      pageSize: String(Math.min(Math.max(input.pageSize ?? 20, 1), 20)),
    },
  );
  if (!result.ok) {
    return { kind: "failed", reason: "amazon_listings_read_failed" };
  }
  const payload = result.payload as {
    items?: readonly {
      sku?: string;
      summaries?: readonly {
        asin?: string;
        status?: readonly string[];
        itemName?: string;
      }[];
      issues?: readonly { code?: string; message?: string; severity?: string }[];
    }[];
  };
  const listings = (payload.items ?? []).map((item) => {
    const summary = item.summaries?.[0];
    return {
      sku: item.sku,
      asin: summary?.asin,
      status: summary?.status,
      itemName: summary?.itemName,
      issues: item.issues,
    } satisfies AmazonListingSummary;
  });
  return { listings };
}

export async function listAmazonInventoryForActor(
  actor: Actor,
  input: { readonly marketplaceId: string },
): Promise<{ readonly inventory: readonly AmazonInventoryRow[] } | AmazonFailed> {
  const access = await requireAccess(actor);
  const result = await spApiGet(
    access.endpoint,
    access.token,
    "/fba/inventory/v1/summaries",
    {
      details: "true",
      granularityType: "Marketplace",
      granularityId: input.marketplaceId,
      marketplaceIds: input.marketplaceId,
    },
  );
  if (!result.ok) {
    return { kind: "failed", reason: "amazon_inventory_read_failed" };
  }
  const payload = result.payload as {
    payload?: {
      inventorySummaries?: readonly {
        asin?: string;
        sellerSku?: string;
        fnSku?: string;
        totalQuantity?: number;
        inventoryDetails?: {
          fulfillableQuantity?: number;
          inboundWorkingQuantity?: number;
          inboundShippedQuantity?: number;
          inboundReceivingQuantity?: number;
        };
      }[];
    };
  };
  const inventory = (payload.payload?.inventorySummaries ?? []).map((row) => ({
    asin: row.asin,
    sellerSku: row.sellerSku,
    fnSku: row.fnSku,
    totalQuantity: row.totalQuantity,
    fulfillableQuantity: row.inventoryDetails?.fulfillableQuantity,
    inboundWorkingQuantity: row.inventoryDetails?.inboundWorkingQuantity,
    inboundShippedQuantity: row.inventoryDetails?.inboundShippedQuantity,
    inboundReceivingQuantity: row.inventoryDetails?.inboundReceivingQuantity,
  }));
  return { inventory };
}

export async function listAmazonOrdersForActor(
  actor: Actor,
  input: { readonly marketplaceId: string; readonly createdAfter?: string },
): Promise<{ readonly orders: readonly AmazonOrderSummary[] } | AmazonFailed> {
  const access = await requireAccess(actor);
  const createdAfter =
    input.createdAfter ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await spApiGet(access.endpoint, access.token, "/orders/v0/orders", {
    MarketplaceIds: input.marketplaceId,
    CreatedAfter: createdAfter,
  });
  if (!result.ok) {
    return { kind: "failed", reason: "amazon_orders_read_failed" };
  }
  const payload = result.payload as {
    payload?: { Orders?: readonly Record<string, unknown>[] };
  };
  const orders = (payload.payload?.Orders ?? [])
    .map((order) => stripOrderPii(order))
    .filter((order) => order.amazonOrderId);
  assertNoPii(orders);
  return { orders };
}

export async function listAmazonSalesMetricsForActor(
  actor: Actor,
  input: { readonly marketplaceId: string },
): Promise<{ readonly metrics: readonly AmazonSalesMetric[] } | AmazonFailed> {
  const access = await requireAccess(actor);
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const interval = `${start.toISOString()}--${end.toISOString()}`;
  const result = await spApiGet(access.endpoint, access.token, "/sales/v1/orderMetrics", {
    marketplaceIds: input.marketplaceId,
    interval,
    granularity: "Day",
  });
  if (!result.ok) {
    return { kind: "failed", reason: "amazon_sales_read_failed" };
  }
  const payload = result.payload as { payload?: readonly AmazonSalesMetric[] };
  return { metrics: payload.payload ?? [] };
}

export async function listAmazonPricesForActor(
  actor: Actor,
  input: { readonly marketplaceId: string; readonly skus: readonly string[] },
): Promise<
  { readonly prices: readonly AmazonPriceRow[] } | AmazonFailed | AmazonUnsupported
> {
  if (input.skus.length === 0) {
    return { kind: "failed", reason: "amazon_pricing_requires_sku" };
  }
  const access = await requireAccess(actor);
  const result = await spApiGet(access.endpoint, access.token, "/products/pricing/v0/price", {
    MarketplaceId: input.marketplaceId,
    ItemType: "Sku",
    Skus: input.skus.slice(0, 20).join(","),
  });
  if (!result.ok) {
    return { kind: "failed", reason: "amazon_pricing_read_failed" };
  }
  const payload = result.payload as {
    payload?: readonly {
      status?: string;
      ASIN?: string;
      SellerSKU?: string;
      Product?: {
        Offers?: readonly {
          BuyingPrice?: { ListingPrice?: { CurrencyCode?: string; Amount?: number } };
        }[];
      };
    }[];
  };
  const prices = (payload.payload ?? []).map((row) => {
    const listing = row.Product?.Offers?.[0]?.BuyingPrice?.ListingPrice;
    return {
      status: row.status,
      asin: row.ASIN,
      sellerSKU: row.SellerSKU,
      listingPrice: listing
        ? { currencyCode: listing.CurrencyCode, amount: listing.Amount }
        : undefined,
    } satisfies AmazonPriceRow;
  });
  return { prices };
}

export function amazonReportsUnsupported(): AmazonUnsupported {
  return { kind: "unsupported", reason: "amazon_reports_not_implemented" };
}

export function amazonAdsUnsupported(): AmazonUnsupported {
  return { kind: "unsupported", reason: "amazon_ads_not_implemented" };
}

export function amazonWriteUnsupported(action: string): AmazonUnsupported {
  return { kind: "unsupported", reason: `amazon_${action}_not_implemented` };
}

export async function analyzeAmazonSellerForActor(
  actor: Actor,
  input: { readonly marketplaceId?: string; readonly lowInventoryThreshold?: number },
): Promise<
  | {
      readonly source: "amazon_sp_api";
      readonly sellingPartnerId: string;
      readonly marketplaceId: string;
      readonly marketplaceCount: number;
      readonly listingCount: number;
      readonly lowInventory: readonly AmazonInventoryRow[];
      readonly listingsNeedingAttention: readonly AmazonListingSummary[];
      readonly sales: readonly AmazonSalesMetric[];
      readonly errors: readonly string[];
    }
  | AmazonFailed
> {
  const summary = await getSocialCredentialSummary(actor.organizationId, "amazon");
  const sellingPartnerId = summary?.externalAccountId?.trim();
  if (!sellingPartnerId) {
    return { kind: "failed", reason: "amazon_not_connected" };
  }
  const marketplaces = await listAmazonMarketplacesForActor(actor);
  if ("kind" in marketplaces) return marketplaces;
  const marketplaceId =
    input.marketplaceId?.trim() || marketplaces.marketplaces[0]?.marketplaceId;
  if (!marketplaceId) {
    return { kind: "failed", reason: "amazon_no_marketplace" };
  }
  const errors: string[] = [];
  const listings = await listAmazonListingsForActor(actor, { marketplaceId });
  if ("kind" in listings) errors.push(listings.reason);
  const inventory = await listAmazonInventoryForActor(actor, { marketplaceId });
  if ("kind" in inventory) errors.push(inventory.reason);
  const sales = await listAmazonSalesMetricsForActor(actor, { marketplaceId });
  if ("kind" in sales) errors.push(sales.reason);

  const listingRows = "listings" in listings ? listings.listings : [];
  const inventoryRows = "inventory" in inventory ? inventory.inventory : [];
  const salesRows = "metrics" in sales ? sales.metrics : [];
  const threshold = input.lowInventoryThreshold ?? 5;

  return {
    source: "amazon_sp_api",
    sellingPartnerId,
    marketplaceId,
    marketplaceCount: marketplaces.marketplaces.length,
    listingCount: listingRows.length,
    lowInventory: inventoryRows.filter((row) => (row.fulfillableQuantity ?? row.totalQuantity ?? 0) <= threshold),
    listingsNeedingAttention: listingRows.filter(
      (row) => (row.issues && row.issues.length > 0) || row.status?.includes("INCOMPLETE"),
    ),
    sales: salesRows,
    errors,
  };
}
