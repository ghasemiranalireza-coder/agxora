import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HIDDEN_PRIMARY_NAV_HREFS, PRIMARY_NAV_ITEMS } from "./firstCustomerSurface";
import { firstCustomerLegacyRedirect } from "./firstCustomerHardening";

const ROOT = path.resolve(__dirname, "../../..");

function page(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

const REAL_ROUTES = [
  "app/dashboard/page.tsx",
  "app/dashboard/crm/page.tsx",
  "app/dashboard/finance/page.tsx",
  "app/dashboard/agents/page.tsx",
  "app/dashboard/settings/page.tsx",
] as const;

describe("phase 17 honest product surface", () => {
  it("keeps the five production routes in place", () => {
    const hrefs = PRIMARY_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toEqual([
      "/dashboard",
      "/dashboard/crm",
      "/dashboard/finance",
      "/dashboard/agents",
      "/dashboard/settings",
    ]);
    for (const route of REAL_ROUTES) {
      const source = page(route);
      expect(source).not.toContain("FirstCustomerLegacyUnavailable");
      expect(source).not.toContain("FirstCustomerLegacyRedirect");
    }
  });

  it("does not render fake analytics, automation, creator, social, or integrations", () => {
    const locked = [
      ["app/dashboard/analytics/page.tsx", "dashboard.legacy.analytics.title", "EnterpriseIntelligenceCenter"],
      ["app/dashboard/automation/page.tsx", "dashboard.legacy.automation.title", "AutomationWorkspace"],
      ["app/dashboard/creator/page.tsx", "dashboard.legacy.creator.title", "CreatorStudioPage"],
      ["app/dashboard/social/page.tsx", "dashboard.legacy.social.title", "SocialHub"],
      ["app/dashboard/integrations/page.tsx", "dashboard.legacy.integrations.title", "IntegrationCenter"],
      ["app/dashboard/documents/page.tsx", "dashboard.legacy.documents.title", "DocumentsHubPage"],
    ] as const;
    for (const [file, titleKey, forbidden] of locked) {
      const source = page(file);
      expect(source).toContain("FirstCustomerLegacyUnavailable");
      expect(source).toContain(titleKey);
      expect(source).not.toContain(forbidden);
      expect(source).not.toContain("simulated: true");
    }
    const home = page("app/components/dashboard/DashboardHome.tsx");
    expect(home).not.toContain("IntegrationsSnapshot");
    expect(home).not.toContain("/dashboard/integrations");
  });

  it("sends memory back to the existing Agent OS and billing away from mock checkout", () => {
    const memory = page("app/dashboard/memory/page.tsx");
    expect(memory).toContain('firstCustomerLegacyRedirect("/dashboard/memory")');
    expect(memory).not.toContain("BusinessMemory");
    expect(firstCustomerLegacyRedirect("/dashboard/memory")).toBe("/dashboard/agents");

    const billing = page("app/dashboard/billing/page.tsx");
    const admin = page("app/dashboard/billing/admin/page.tsx");
    expect(billing).toContain('firstCustomerLegacyRedirect("/dashboard/billing")');
    expect(admin).toContain('firstCustomerLegacyRedirect("/dashboard/billing")');
    expect(billing).not.toContain("CustomerBillingPortal");
    expect(billing).not.toContain("checkout=mock");
    expect(admin).not.toContain("AdminBillingPanel");
    expect(firstCustomerLegacyRedirect("/dashboard/billing")).toBe(
      "/dashboard/settings#billing",
    );

    const settings = page("app/components/settings/SettingsPanels.tsx");
    const billingPanel = page("app/components/settings/BillingSettingsPanel.tsx");
    expect(settings).toContain("BillingSettingsPanel");
    expect(billingPanel).toContain("settings.billing.unavailable");
    expect(billingPanel).toContain("/api/v1/billing/subscription");
    expect(settings).not.toContain("AccountBillingSection");
    expect(settings).not.toContain("CustomerBillingPortal");
    expect(billingPanel).not.toContain("CustomerBillingPortal");
    expect(billingPanel).not.toContain("4242");
    expect(settings).not.toContain("status: \"mock\"");
  });

  it("hides the locked routes from primary navigation", () => {
    for (const href of [
      "/dashboard/analytics",
      "/dashboard/automation",
      "/dashboard/creator",
      "/dashboard/social",
      "/dashboard/integrations",
      "/dashboard/documents",
      "/dashboard/memory",
      "/dashboard/billing",
    ]) {
      expect(HIDDEN_PRIMARY_NAV_HREFS).toContain(href);
      expect(PRIMARY_NAV_ITEMS.some((item) => item.href === href)).toBe(false);
    }
  });
});
