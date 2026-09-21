import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIRST_CUSTOMER_AGENTS_HREF,
  FIRST_CUSTOMER_CUSTOMER_HREF,
  FIRST_CUSTOMER_FINANCE_HREF,
  HIDDEN_PRIMARY_NAV_HREFS,
  PRIMARY_NAV_ITEMS,
  customerCtaHref,
  isFirstCustomerSearchHrefAllowed,
  isHiddenPrimaryNavHref,
} from "./firstCustomerSurface";
import {
  COMMAND_ENTRIES,
  QUICK_ACTIONS,
  buildSearchIndex,
  resetSearchIndexCache,
} from "./search-index";

const ROOT = path.resolve(__dirname, "../../..");

const FORBIDDEN_PRIMARY_HREFS = [
  "/dashboard/customers",
  "/dashboard/projects",
  "/dashboard/analytics",
  "/dashboard/billing",
  "/dashboard/documents",
  "/dashboard/creator",
  "/dashboard/automation",
  "/dashboard/team",
  "/dashboard/email",
] as const;

describe("first-customer surface lockdown", () => {
  it("keeps production navigation on the first-customer allow-list", () => {
    const hrefs = PRIMARY_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toEqual([
      "/dashboard",
      "/dashboard/crm",
      "/dashboard/finance",
      "/dashboard/agents",
      "/dashboard/settings",
    ]);
    for (const href of FORBIDDEN_PRIMARY_HREFS) {
      expect(hrefs).not.toContain(href);
      expect(HIDDEN_PRIMARY_NAV_HREFS).toContain(href);
    }
  });

  it("resolves the customer CTA to Prisma CRM", () => {
    expect(customerCtaHref()).toBe("/dashboard/crm");
    expect(FIRST_CUSTOMER_CUSTOMER_HREF).toBe("/dashboard/crm");
    expect(FIRST_CUSTOMER_FINANCE_HREF).toBe("/dashboard/finance");
    expect(FIRST_CUSTOMER_AGENTS_HREF).toBe("/dashboard/agents");
  });

  it("does not expose a normal dashboard customer CTA to the legacy store", () => {
    expect(
      [...QUICK_ACTIONS, ...COMMAND_ENTRIES].some(
        (item) => item.href === "/dashboard/customers",
      ),
    ).toBe(false);
    expect(
      QUICK_ACTIONS.some((item) => item.id === "action-create-customer"),
    ).toBe(true);
    expect(
      QUICK_ACTIONS.find((item) => item.id === "action-create-customer")?.href,
    ).toBe("/dashboard/crm");
  });

  it("keeps CRM and Finance routes available", () => {
    expect(
      existsSync(path.join(ROOT, "app/dashboard/crm/page.tsx")),
    ).toBe(true);
    expect(
      existsSync(path.join(ROOT, "app/dashboard/finance/page.tsx")),
    ).toBe(true);
    expect(PRIMARY_NAV_ITEMS.some((item) => item.href === "/dashboard/crm")).toBe(
      true,
    );
    expect(
      PRIMARY_NAV_ITEMS.some((item) => item.href === "/dashboard/finance"),
    ).toBe(true);
  });

  it("does not hardcode the legacy customer route in first-customer UI", () => {
    const files = [
      "app/components/dashboard/DashboardHome.tsx",
      "app/components/dashboard/QuickActions.tsx",
      "app/components/dashboard/BusinessOverview.tsx",
      "app/components/dashboard/ActivityFeed.tsx",
      "app/components/DashboardSidebar.tsx",
      "app/components/DashboardTopNav.tsx",
    ] as const;
    for (const file of files) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(text, file).not.toContain("/dashboard/customers");
    }
  });

  it("keeps workspace search off hidden first-customer surfaces", () => {
    resetSearchIndexCache();
    const index = buildSearchIndex();
    for (const item of index) {
      expect(isHiddenPrimaryNavHref(item.href)).toBe(false);
      expect(isFirstCustomerSearchHrefAllowed(item.href)).toBe(true);
    }
    expect(index.some((item) => item.href === "/dashboard/crm")).toBe(true);
    expect(index.some((item) => item.href === "/dashboard/customers")).toBe(
      false,
    );
    expect(index.some((item) => item.href === "/dashboard/team")).toBe(false);
    expect(index.some((item) => item.href === "/dashboard/email")).toBe(false);
  });
});
