import { afterEach, describe, expect, it } from "vitest";
import {
  hasMarketplacePlanAccess,
  setMarketplaceEntitlementForTests,
} from "./entitlements";
import { MARKETPLACE_CATALOG } from "./marketplace-catalog";
import { evaluateAmazonCapability } from "./capabilities";
import {
  PRODUCT_STRUCTURE,
  amazonSellerConnectedInWorkspace,
  canStartOfficialConnect,
  productPackageForProvider,
} from "./product-structure";

describe("marketplace entitlements", () => {
  afterEach(() => {
    setMarketplaceEntitlementForTests(null);
    delete process.env.AGXORA_MARKETPLACE_ENTITLEMENT;
    delete process.env.AGXORA_MARKETPLACE_ENTITLED_ORG_IDS;
  });

  it("denies Marketplace plan access by default", () => {
    expect(hasMarketplacePlanAccess("org-a")).toMatchObject({
      entitled: false,
      source: "denied_default",
    });
  });

  it("does not treat a connection as plan access", () => {
    const capability = evaluateAmazonCapability({
      planAccess: false,
      configured: true,
      connected: true,
      canRead: true,
      environment: "production",
    });
    expect(capability.connected).toBe(true);
    expect(capability.canAnalyze).toBe(false);
    expect(capability.missingSteps[0]?.code).toBe("plan_required");
  });

  it("requires provider read permission even when connected", () => {
    const capability = evaluateAmazonCapability({
      planAccess: true,
      configured: true,
      connected: true,
      canRead: false,
      environment: "production",
    });
    expect(capability.canAnalyze).toBe(false);
    expect(capability.missingSteps.map((step) => step.code)).toEqual([
      "read_permission_required",
    ]);
  });

  it("allowlists organizations without activating a fake billing plan", () => {
    process.env.AGXORA_MARKETPLACE_ENTITLED_ORG_IDS = "org-a, org-c";
    expect(hasMarketplacePlanAccess("org-a").entitled).toBe(true);
    expect(hasMarketplacePlanAccess("org-b").entitled).toBe(false);
    expect(hasMarketplacePlanAccess("org-a").source).toBe("environment");
  });

  it("honors a local environment entitlement flag without billing", () => {
    process.env.AGXORA_MARKETPLACE_ENTITLEMENT = "true";
    expect(hasMarketplacePlanAccess("org-a")).toMatchObject({
      entitled: true,
      source: "environment",
    });
  });

  it("lists future marketplaces as not implemented without fake Amazon data", () => {
    expect(MARKETPLACE_CATALOG.map((item) => item.provider)).toEqual([
      "amazon_seller",
      "alibaba",
      "ebay",
      "shopify",
    ]);
    expect(
      MARKETPLACE_CATALOG.filter((item) => item.provider !== "amazon_seller").every(
        (item) => item.implementationStatus === "not_implemented" && item.tier === "premium",
      ),
    ).toBe(true);
  });

  it("maps Core, Social, and Premium packages without billing", () => {
    expect(PRODUCT_STRUCTURE.map((pkg) => pkg.id)).toEqual(["core", "social", "premium"]);
    expect(productPackageForProvider("email_gmail")).toBe("core");
    expect(productPackageForProvider("youtube")).toBe("social");
    expect(productPackageForProvider("amazon_seller")).toBe("premium");
    expect(
      PRODUCT_STRUCTURE.find((pkg) => pkg.id === "premium")?.features.some(
        (feature) => feature.id === "marketplace",
      ),
    ).toBe(true);
  });

  it("requires a workspace connection row before treating Amazon as connected", () => {
    expect(
      amazonSellerConnectedInWorkspace({
        credentialLive: true,
        workspaceStatus: null,
      }),
    ).toBe(false);
    expect(
      amazonSellerConnectedInWorkspace({
        credentialLive: true,
        workspaceStatus: "connected",
      }),
    ).toBe(true);
  });

  it("does not advertise Amazon Connect without plan access", () => {
    expect(
      canStartOfficialConnect({
        implementationStatus: "oauth_ready",
        connected: false,
        planAccess: false,
      }),
    ).toBe(false);
    expect(
      canStartOfficialConnect({
        implementationStatus: "oauth_ready",
        connected: false,
        planAccess: true,
      }),
    ).toBe(true);
    expect(
      canStartOfficialConnect({
        implementationStatus: "not_implemented",
        connected: false,
        planAccess: true,
      }),
    ).toBe(false);
  });
});
