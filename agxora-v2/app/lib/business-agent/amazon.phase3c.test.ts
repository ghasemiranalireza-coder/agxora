import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { redactSecrets } from "./redact";
import {
  setSocialCredentialStoreForTests,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import { setAmazonSpApiHttpForTests } from "@/app/lib/amazon/client";
import {
  setAmazonOAuthHttpForTests,
  beginAmazonOAuthForActor,
  continueAmazonOAuthLoginForActor,
} from "@/app/lib/amazon/oauth";
import { amazonReportsUnsupported, amazonAdsUnsupported } from "@/app/lib/amazon/client";

const policyState = vi.hoisted(() => ({
  mode: "SAFE" as "SAFE" | "ASSISTED" | "AUTONOMOUS",
  flags: {
    canRead: true,
    canCreateDraft: true,
    canSchedule: false,
    canPublish: false,
    canSendEmail: false,
    canDelete: false,
  },
}));

const actorRef = vi.hoisted(() => ({ current: null as Actor | null }));

vi.mock("./policy", () => ({
  getAgentPolicyForActor: vi.fn(async () => ({
    organizationId: "org-a",
    workspaceId: "ws-a",
    mode: policyState.mode,
    updatedAt: null,
  })),
}));

vi.mock("./integrations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./integrations")>();
  return {
    ...actual,
    assertProviderPermission: vi.fn(async (actor, provider, permission) => {
      if (actor.organizationId !== "org-a" || actor.workspaceId !== "ws-a") {
        throw new PersistenceError(
          "forbidden",
          `Permission ${permission} is not granted for ${provider}`,
        );
      }
      const granted =
        permission === "read"
          ? policyState.flags.canRead
          : permission === "publish"
            ? policyState.flags.canPublish
            : false;
      if (!granted) {
        throw new PersistenceError(
          "forbidden",
          `Permission ${permission} is not granted for ${provider}`,
        );
      }
    }),
  };
});

vi.mock("./audit", () => ({
  recordExternalAction: vi.fn(async () => {}),
}));

vi.mock("@/app/lib/tenancy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenancy")>();
  return {
    ...actual,
    requireCurrentActor: vi.fn(async () => {
      if (!actorRef.current) {
        throw new actual.PersistenceError("unauthorized", "Authentication required");
      }
      return actorRef.current;
    }),
  };
});

vi.mock("@/app/lib/auth/server/http", () => ({
  requireDatabase: vi.fn(() => undefined),
}));

vi.mock("@/app/lib/security/rate-limit", () => ({
  rateLimitResponse: vi.fn(async () => null),
}));

import { recordExternalAction } from "./audit";
import { executeAmazonToolForActor } from "./amazon-tools";
import { GET as amazonResource, POST as amazonWrite } from "@/app/api/v1/integrations/amazon_seller/[resource]/route";
import { POST as connectAmazon } from "@/app/api/v1/integrations/[provider]/connect/route";

const actorA: Actor = {
  userId: "user-a",
  email: "a@test.agxora",
  name: "Owner A",
  organizationId: "org-a",
  workspaceId: "ws-a",
  membershipId: "mem-a",
  role: "OWNER",
  sessionToken: "session-a",
};

const actorB: Actor = {
  userId: "user-b",
  email: "b@test.agxora",
  name: "Owner B",
  organizationId: "org-b",
  workspaceId: "ws-b",
  membershipId: "mem-b",
  role: "OWNER",
  sessionToken: "session-b",
};

function assertNoSecretLeak(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Atza|");
  expect(serialized).not.toContain("Atzr|");
  expect(serialized).not.toContain("amazon-lwa-secret");
}

async function seedAmazon(actor: Actor = actorA): Promise<void> {
  await upsertSocialCredentialForActor(actor, "amazon", {
    tokens: {
      accessToken: "Atza|amazon-access",
      refreshToken: "Atzr|amazon-refresh",
    },
    scopes: ["selling_partner_api"],
    externalAccountId: `seller-${actor.organizationId}`,
    externalAccountName: `seller-${actor.organizationId}`,
  });
}

function spApiFetchMock(): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/sellers/v1/marketplaceParticipations")) {
      return Response.json({
        payload: [
          {
            marketplace: {
              id: "ATVPDKIKX0DER",
              countryCode: "US",
              name: "Amazon.com",
              defaultCurrencyCode: "USD",
              defaultLanguageCode: "en_US",
            },
            participation: { isParticipating: true, hasSuspendedListings: false },
          },
        ],
      });
    }
    if (url.includes("/listings/2021-08-01/items/")) {
      return Response.json({
        items: [
          {
            sku: "SKU-1",
            summaries: [{ asin: "B00TEST", status: ["BUYABLE"], itemName: "Test item" }],
            issues: [],
          },
          {
            sku: "SKU-2",
            summaries: [{ asin: "B00ISSUE", status: ["INCOMPLETE"], itemName: "Needs work" }],
            issues: [{ code: "missing_image", message: "Add an image", severity: "ERROR" }],
          },
        ],
      });
    }
    if (url.includes("/fba/inventory/v1/summaries")) {
      return Response.json({
        payload: {
          inventorySummaries: [
            { sellerSku: "SKU-1", totalQuantity: 80, inventoryDetails: { fulfillableQuantity: 80 } },
            { sellerSku: "SKU-2", totalQuantity: 2, inventoryDetails: { fulfillableQuantity: 2 } },
          ],
        },
      });
    }
    if (url.includes("/orders/v0/orders")) {
      return Response.json({
        payload: {
          Orders: [
            {
              AmazonOrderId: "111-222",
              PurchaseDate: "2026-09-01T00:00:00Z",
              OrderStatus: "Shipped",
              OrderTotal: { CurrencyCode: "USD", Amount: "19.99" },
              BuyerInfo: { BuyerEmail: "secret@example.com", BuyerName: "Hidden" },
              ShippingAddress: { Name: "Hidden", AddressLine1: "1 Secret St" },
            },
          ],
        },
      });
    }
    if (url.includes("/sales/v1/orderMetrics")) {
      return Response.json({
        payload: [{ interval: "Day", unitCount: 4, orderCount: 3 }],
      });
    }
    if (url.includes("/products/pricing/v0/price")) {
      return Response.json({
        payload: [
          {
            status: "Success",
            SellerSKU: "SKU-1",
            Product: {
              Offers: [{ BuyingPrice: { ListingPrice: { CurrencyCode: "USD", Amount: 19.99 } } }],
            },
          },
        ],
      });
    }
    return new Response(JSON.stringify({ errors: [{ code: "NotFound" }] }), { status: 404 });
  }) as typeof fetch;
}

describe("Phase 3C Amazon Seller SP-API", () => {
  beforeEach(async () => {
    actorRef.current = actorA;
    policyState.mode = "SAFE";
    policyState.flags.canRead = true;
    policyState.flags.canPublish = false;
    setSocialCredentialStoreForTests(null);
    setAmazonSpApiHttpForTests({ fetch: spApiFetchMock() });
    setAmazonOAuthHttpForTests(null);
    process.env.NODE_ENV = "test";
    process.env.AGXORA_AMAZON_SELLER_ENABLED = "true";
    process.env.AGXORA_AMAZON_LWA_CLIENT_ID = "amazon-lwa-id";
    process.env.AGXORA_AMAZON_LWA_CLIENT_SECRET = "amazon-lwa-secret";
    process.env.AGXORA_AMAZON_SP_API_APPLICATION_ID = "amzn1.sellerapps.app.test";
    process.env.AGXORA_AMAZON_SP_API_REDIRECT_URI =
      "http://localhost:3000/api/v1/integrations/amazon_seller/callback";
    vi.clearAllMocks();
    await seedAmazon();
  });

  afterEach(() => {
    setSocialCredentialStoreForTests(null);
    setAmazonSpApiHttpForTests(null);
    setAmazonOAuthHttpForTests(null);
  });

  it("rejects unauthenticated Amazon reads with 401", async () => {
    actorRef.current = null;
    const response = await amazonResource(
      new Request("http://localhost/api/v1/integrations/amazon_seller/marketplaces"),
      { params: Promise.resolve({ resource: "marketplaces" }) },
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    assertNoSecretLeak(body);
  });

  it("rejects unauthenticated Amazon connect with 401", async () => {
    actorRef.current = null;
    const response = await connectAmazon(
      new Request("http://localhost/api/v1/integrations/amazon_seller/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/dashboard/amazon" }),
      }),
      { params: Promise.resolve({ provider: "amazon_seller" }) },
    );
    expect(response.status).toBe(401);
  });

  it("isolates organization B from organization A Amazon credentials", async () => {
    await expect(
      executeAmazonToolForActor(actorB, "amazon.list_marketplaces"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("isolates workspace B from workspace A Amazon access", async () => {
    const workspaceB: Actor = {
      ...actorA,
      workspaceId: "ws-b",
    };
    await expect(
      executeAmazonToolForActor(workspaceB, "amazon.list_marketplaces"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("lists marketplaces only after an official SP-API response", async () => {
    const result = await executeAmazonToolForActor(actorA, "amazon.list_marketplaces");
    expect(result).toMatchObject({
      marketplaces: [{ marketplaceId: "ATVPDKIKX0DER", countryCode: "US" }],
    });
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "amazon_seller",
        action: "amazon.list_marketplaces",
        status: "completed",
      }),
    );
    assertNoSecretLeak(result);
  });

  it("reads listings and inventory from official endpoints", async () => {
    const listings = await executeAmazonToolForActor(actorA, "amazon.list_listings", {
      marketplaceId: "ATVPDKIKX0DER",
    });
    const inventory = await executeAmazonToolForActor(actorA, "amazon.list_inventory", {
      marketplaceId: "ATVPDKIKX0DER",
    });
    expect(listings).toMatchObject({
      listings: expect.arrayContaining([expect.objectContaining({ sku: "SKU-1" })]),
    });
    expect(inventory).toMatchObject({
      inventory: expect.arrayContaining([expect.objectContaining({ sellerSku: "SKU-2", totalQuantity: 2 })]),
    });
  });

  it("strips buyer PII from Amazon orders", async () => {
    const result = await executeAmazonToolForActor(actorA, "amazon.list_orders", {
      marketplaceId: "ATVPDKIKX0DER",
    });
    expect(result).toMatchObject({
      orders: [{ amazonOrderId: "111-222", orderStatus: "Shipped" }],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret@example.com");
    expect(serialized).not.toContain("BuyerInfo");
    expect(serialized).not.toContain("1 Secret St");
  });

  it("analyzes real seller data without inventing products", async () => {
    const result = await executeAmazonToolForActor(actorA, "amazon.analyze", {
      marketplaceId: "ATVPDKIKX0DER",
    });
    expect(result).toMatchObject({
      source: "amazon_sp_api",
      listingCount: 2,
      lowInventory: [expect.objectContaining({ sellerSku: "SKU-2" })],
      listingsNeedingAttention: [expect.objectContaining({ sku: "SKU-2" })],
    });
    expect(JSON.stringify(result)).not.toContain("fake");
  });

  it("returns official marketplace reads over HTTP without secrets", async () => {
    const response = await amazonResource(
      new Request("http://localhost/api/v1/integrations/amazon_seller/marketplaces"),
      { params: Promise.resolve({ resource: "marketplaces" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.marketplaces).toEqual(
      expect.arrayContaining([expect.objectContaining({ marketplaceId: "ATVPDKIKX0DER" })]),
    );
    assertNoSecretLeak(body);
  });

  it("returns official API failures without fake success", async () => {
    setAmazonSpApiHttpForTests({
      fetch: (async () =>
        new Response(JSON.stringify({ errors: [{ code: "Unauthorized" }] }), {
          status: 403,
        })) as typeof fetch,
    });
    const result = await executeAmazonToolForActor(actorA, "amazon.list_marketplaces");
    expect(result).toMatchObject({ kind: "failed", reason: "amazon_marketplace_read_failed" });
    const http = await amazonResource(
      new Request("http://localhost/api/v1/integrations/amazon_seller/marketplaces"),
      { params: Promise.resolve({ resource: "marketplaces" }) },
    );
    expect(http.status).toBe(502);
    const body = await http.json();
    expect(body.ok).toBe(false);
    expect(body.kind).toBe("failed");
    assertNoSecretLeak(body);
  });

  it("denies Amazon reads without canRead", async () => {
    policyState.flags.canRead = false;
    await expect(
      executeAmazonToolForActor(actorA, "amazon.list_marketplaces"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("blocks Amazon writes in SAFE mode", async () => {
    policyState.mode = "SAFE";
    policyState.flags.canPublish = true;
    await expect(
      executeAmazonToolForActor(actorA, "amazon.update_price"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns 501 for Amazon writes even when publish permission is on", async () => {
    policyState.mode = "ASSISTED";
    policyState.flags.canPublish = true;
    await expect(
      executeAmazonToolForActor(actorA, "amazon.update_inventory"),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("does not implement reports or Amazon Ads", () => {
    expect(amazonReportsUnsupported()).toMatchObject({
      kind: "unsupported",
      reason: "amazon_reports_not_implemented",
    });
    expect(amazonAdsUnsupported()).toMatchObject({
      kind: "unsupported",
      reason: "amazon_ads_not_implemented",
    });
  });

  it("starts official Amazon website authorization without returning secrets", async () => {
    const result = await beginAmazonOAuthForActor(actorA, "/dashboard/amazon");
    expect(result.authorizationUrl).toContain("sellercentral.amazon.com/apps/authorize/consent");
    expect(result.authorizationUrl).toContain("application_id=");
    expect(result.authorizationUrl).toContain("version=beta");
    expect(result.authorizationUrl).not.toContain("amazon-lwa-secret");
    assertNoSecretLeak(result);
  });

  it("continues official Amazon login only to allowlisted Amazon callback hosts", async () => {
    await beginAmazonOAuthForActor(actorA, "/dashboard/amazon");
    const result = await continueAmazonOAuthLoginForActor(actorA, {
      amazonCallbackUri:
        "https://amazon.com/apps/authorize/confirm/amzn1.sellerapps.app.test",
      amazonState: "amazon-state",
      sellingPartnerId: "A3SELLER",
      version: "beta",
    });
    expect(result.amazonRedirectUrl).toContain("amazon.com/apps/authorize/confirm/");
    expect(result.amazonRedirectUrl).toContain("amazon_state=amazon-state");
    expect(result.amazonRedirectUrl).toContain("version=beta");
    expect(result.amazonRedirectUrl).toContain("redirect_uri=");
    expect(result.amazonRedirectUrl).not.toContain("amazon-lwa-secret");
    assertNoSecretLeak(result);

    await expect(
      continueAmazonOAuthLoginForActor(actorA, {
        amazonCallbackUri: "https://evil.example/apps/authorize/confirm/x",
        amazonState: "amazon-state",
        sellingPartnerId: "A3SELLER",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns 501 for reports and Amazon writes over HTTP", async () => {
    const reports = await amazonResource(
      new Request("http://localhost/api/v1/integrations/amazon_seller/reports"),
      { params: Promise.resolve({ resource: "reports" }) },
    );
    expect(reports.status).toBe(501);
    const reportsBody = await reports.json();
    expect(reportsBody).toMatchObject({ kind: "unsupported", reason: "amazon_reports_not_implemented" });
    assertNoSecretLeak(reportsBody);

    const write = await amazonWrite();
    expect(write.status).toBe(501);
    const writeBody = await write.json();
    expect(writeBody).toMatchObject({ kind: "unsupported", reason: "amazon_write_not_implemented" });
    assertNoSecretLeak(writeBody);
  });

  it("redacts Amazon LWA tokens from audit-shaped payloads", () => {
    const redacted = redactSecrets({
      access_token: "Atza|amazon-access",
      refresh_token: "Atzr|amazon-refresh",
      client_secret: "amazon-lwa-secret",
      ok: true,
    });
    expect(redacted.access_token).toBe("[redacted]");
    expect(redacted.refresh_token).toBe("[redacted]");
    expect(redacted.client_secret).toBe("[redacted]");
    expect(redacted.ok).toBe(true);
  });

  it("replays Amazon reads without inventing a second dataset", async () => {
    const first = await executeAmazonToolForActor(actorA, "amazon.list_marketplaces");
    const second = await executeAmazonToolForActor(actorA, "amazon.list_marketplaces");
    expect(first).toEqual(second);
  });
});
