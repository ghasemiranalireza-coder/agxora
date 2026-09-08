/**
 * Phase 3C — Amazon Seller Business Agent tools (official SP-API reads only).
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  amazonAdsUnsupported,
  amazonReportsUnsupported,
  amazonWriteUnsupported,
  analyzeAmazonSellerForActor,
  listAmazonInventoryForActor,
  listAmazonListingsForActor,
  listAmazonMarketplacesForActor,
  listAmazonOrdersForActor,
  listAmazonPricesForActor,
  listAmazonSalesMetricsForActor,
} from "@/app/lib/amazon/client";
import { recordExternalAction } from "./audit";
import { assertProviderPermission } from "./integrations";
import { getAgentPolicyForActor } from "./policy";
import { redactSecrets } from "./redact";
import type { AgentToolName } from "./tools";

export const AMAZON_CHAT_GUIDANCE =
  "Amazon Seller uses the official Selling Partner API only. Reads (marketplaces, listings, inventory, non-PII orders, sales, pricing) may run when connected and canRead is granted. Price changes, inventory changes, listing edits, cancellations, refunds, reports, and Amazon Ads are not implemented. Never invent Amazon data. Never include LWA tokens or client secrets in replies.";

export type AmazonToolName =
  | "amazon.list_marketplaces"
  | "amazon.list_listings"
  | "amazon.list_inventory"
  | "amazon.list_orders"
  | "amazon.list_sales"
  | "amazon.list_pricing"
  | "amazon.analyze"
  | "amazon.update_price"
  | "amazon.update_inventory";

export type AmazonToolArgs = {
  readonly marketplaceId?: string;
  readonly pageSize?: number;
  readonly createdAfter?: string;
  readonly skus?: readonly string[];
  readonly lowInventoryThreshold?: number;
};

function publicToolPayload<T>(value: T): T {
  return redactSecrets(value);
}

async function assertAmazonRead(actor: Actor): Promise<void> {
  await assertProviderPermission(actor, "amazon_seller", "read");
}

async function assertAmazonWriteBlocked(actor: Actor, action: AmazonToolName): Promise<never> {
  const policy = await getAgentPolicyForActor(actor);
  if (policy.mode === "SAFE") {
    await recordExternalAction({
      actor,
      provider: "amazon_seller",
      action,
      status: "approval_required",
      error: "safe_mode_blocks_amazon_writes",
    });
    throw new PersistenceError(
      "forbidden",
      "SAFE MODE blocks Amazon commercial write operations",
    );
  }
  await assertProviderPermission(actor, "amazon_seller", "publish");
  await recordExternalAction({
    actor,
    provider: "amazon_seller",
    action,
    status: "failed",
    error: "amazon_write_not_implemented",
  });
  throw new PersistenceError(
    "validation",
    "Amazon write operations are not implemented",
    { status: 501 },
  );
}

export function isAmazonToolName(name: string): name is AmazonToolName {
  return name.startsWith("amazon.");
}

export async function executeAmazonToolForActor(
  actor: Actor,
  name: AmazonToolName,
  args: AmazonToolArgs = {},
): Promise<unknown> {
  switch (name) {
    case "amazon.list_marketplaces": {
      await assertAmazonRead(actor);
      const result = await listAmazonMarketplacesForActor(actor);
      await recordExternalAction({
        actor,
        provider: "amazon_seller",
        action: name,
        status: "kind" in result ? "failed" : "completed",
        error: "kind" in result ? result.reason : null,
      });
      return publicToolPayload(result);
    }
    case "amazon.list_listings": {
      await assertAmazonRead(actor);
      if (!args.marketplaceId) {
        throw new PersistenceError("validation", "marketplaceId is required");
      }
      const result = await listAmazonListingsForActor(actor, {
        marketplaceId: args.marketplaceId,
        pageSize: args.pageSize,
      });
      await recordExternalAction({
        actor,
        provider: "amazon_seller",
        action: name,
        status: "kind" in result ? "failed" : "completed",
        error: "kind" in result ? result.reason : null,
      });
      return publicToolPayload(result);
    }
    case "amazon.list_inventory": {
      await assertAmazonRead(actor);
      if (!args.marketplaceId) {
        throw new PersistenceError("validation", "marketplaceId is required");
      }
      const result = await listAmazonInventoryForActor(actor, {
        marketplaceId: args.marketplaceId,
      });
      await recordExternalAction({
        actor,
        provider: "amazon_seller",
        action: name,
        status: "kind" in result ? "failed" : "completed",
        error: "kind" in result ? result.reason : null,
      });
      return publicToolPayload(result);
    }
    case "amazon.list_orders": {
      await assertAmazonRead(actor);
      if (!args.marketplaceId) {
        throw new PersistenceError("validation", "marketplaceId is required");
      }
      const result = await listAmazonOrdersForActor(actor, {
        marketplaceId: args.marketplaceId,
        createdAfter: args.createdAfter,
      });
      await recordExternalAction({
        actor,
        provider: "amazon_seller",
        action: name,
        status: "kind" in result ? "failed" : "completed",
        error: "kind" in result ? result.reason : null,
      });
      return publicToolPayload(result);
    }
    case "amazon.list_sales": {
      await assertAmazonRead(actor);
      if (!args.marketplaceId) {
        throw new PersistenceError("validation", "marketplaceId is required");
      }
      const result = await listAmazonSalesMetricsForActor(actor, {
        marketplaceId: args.marketplaceId,
      });
      await recordExternalAction({
        actor,
        provider: "amazon_seller",
        action: name,
        status: "kind" in result ? "failed" : "completed",
        error: "kind" in result ? result.reason : null,
      });
      return publicToolPayload(result);
    }
    case "amazon.list_pricing": {
      await assertAmazonRead(actor);
      if (!args.marketplaceId) {
        throw new PersistenceError("validation", "marketplaceId is required");
      }
      const result = await listAmazonPricesForActor(actor, {
        marketplaceId: args.marketplaceId,
        skus: args.skus ?? [],
      });
      await recordExternalAction({
        actor,
        provider: "amazon_seller",
        action: name,
        status: "kind" in result ? "failed" : "completed",
        error: "kind" in result ? result.reason : null,
      });
      return publicToolPayload(result);
    }
    case "amazon.analyze": {
      await assertAmazonRead(actor);
      const result = await analyzeAmazonSellerForActor(actor, {
        marketplaceId: args.marketplaceId,
        lowInventoryThreshold: args.lowInventoryThreshold,
      });
      await recordExternalAction({
        actor,
        provider: "amazon_seller",
        action: name,
        status: "kind" in result ? "failed" : "completed",
        error: "kind" in result ? result.reason : null,
      });
      return publicToolPayload(result);
    }
    case "amazon.update_price":
      return assertAmazonWriteBlocked(actor, name);
    case "amazon.update_inventory":
      return assertAmazonWriteBlocked(actor, name);
    default: {
      const _never: never = name;
      return _never;
    }
  }
}

export function amazonUnsupportedReports(): unknown {
  return publicToolPayload(amazonReportsUnsupported());
}

export function amazonUnsupportedAds(): unknown {
  return publicToolPayload(amazonAdsUnsupported());
}

export function amazonUnsupportedWrite(action: string): unknown {
  return publicToolPayload(amazonWriteUnsupported(action));
}

export function amazonToolNames(): readonly AgentToolName[] {
  return [
    "amazon.list_marketplaces",
    "amazon.list_listings",
    "amazon.list_inventory",
    "amazon.list_orders",
    "amazon.list_sales",
    "amazon.list_pricing",
    "amazon.analyze",
  ];
}
