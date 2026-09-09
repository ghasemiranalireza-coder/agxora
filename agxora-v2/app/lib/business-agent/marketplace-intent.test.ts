import { describe, expect, it } from "vitest";
import {
  detectMarketplaceProviders,
  describeAmazonMarketplaceIntent,
  describeUnsupportedMarketplaceIntent,
  marketplacePlanMessage,
} from "./marketplace-intent";
import {
  MARKETPLACE_OPERATIONS,
  marketplaceOperationStatus,
  marketplaceOutcomeKind,
} from "./marketplace-contract";

describe("marketplace intent and contract", () => {
  it("maps Analyze my Amazon sales to Amazon only", () => {
    expect(detectMarketplaceProviders("Analyze my Amazon sales")).toEqual(["amazon_seller"]);
  });

  it("maps Show my Shopify orders to Shopify only", () => {
    expect(detectMarketplaceProviders("Show my Shopify orders")).toEqual(["shopify"]);
  });

  it("resolves Amazon and eBay independently", () => {
    expect(detectMarketplaceProviders("Compare Amazon and eBay sales")).toEqual([
      "amazon_seller",
      "ebay",
    ]);
  });

  it("does not treat generic listings as Amazon", () => {
    expect(detectMarketplaceProviders("Show me my listings")).toEqual([]);
    expect(detectMarketplaceProviders("Which products have low inventory?")).toEqual([]);
    expect(detectMarketplaceProviders("Show me my orders")).toEqual([]);
  });

  it("returns unsupported for Shopify without inventing a connection", () => {
    const intent = describeUnsupportedMarketplaceIntent("shopify", true);
    expect(intent.kind).toBe("unsupported");
    expect(intent.connected).toBe(false);
    expect(intent.canAnalyze).toBe(false);
    expect(intent.missingSteps.some((step) => step.code === "not_implemented")).toBe(true);
  });

  it("requires Premium before describing an unimplemented marketplace", () => {
    const intent = describeUnsupportedMarketplaceIntent("ebay", false);
    expect(intent.kind).toBe("unsupported");
    expect(intent.planAccess).toBe(false);
    expect(intent.missingSteps[0]?.code).toBe("plan_required");
  });

  it("does not claim Amazon success unless capability is ready", () => {
    const blocked = describeAmazonMarketplaceIntent({
      planAccess: false,
      connected: false,
      canAnalyze: false,
      missingSteps: [
        {
          code: "plan_required",
          message: "Amazon Seller is part of AGXORA Premium Marketplace.",
        },
      ],
    });
    expect(blocked.kind).toBe("human_required");
    expect(blocked.canAnalyze).toBe(false);

    const ready = describeAmazonMarketplaceIntent({
      planAccess: true,
      connected: true,
      canAnalyze: true,
      missingSteps: [],
    });
    expect(ready.kind).toBe("ok");
    expect(ready.message).not.toMatch(/success|completed sales report/i);
  });

  it("joins independent provider messages for comparison goals", () => {
    const message = marketplacePlanMessage([
      describeAmazonMarketplaceIntent({
        planAccess: true,
        connected: true,
        canAnalyze: true,
        missingSteps: [],
      }),
      describeUnsupportedMarketplaceIntent("ebay", true),
    ]);
    expect(message).toContain("Amazon Seller is connected");
    expect(message).toContain("eBay");
    expect(message).not.toContain("access_token");
  });

  it("marks Amazon writes and webhooks unsupported without fake methods", () => {
    expect(marketplaceOperationStatus("amazon_seller", "list_sales")).toBe("ok");
    expect(marketplaceOperationStatus("amazon_seller", "mutate_price")).toBe("unsupported");
    expect(marketplaceOperationStatus("amazon_seller", "webhooks")).toBe("unsupported");
    expect(marketplaceOperationStatus("shopify", "list_orders")).toBe("unsupported");
    expect(marketplaceOperationStatus("alibaba", "connect")).toBe("unsupported");
    expect(MARKETPLACE_OPERATIONS).toContain("discover_marketplaces");
    expect(marketplaceOutcomeKind({ implemented: true, ready: false })).toBe("human_required");
  });
});
