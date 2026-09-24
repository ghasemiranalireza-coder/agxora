import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HIDDEN_PRIMARY_NAV_HREFS, PRIMARY_NAV_ITEMS } from "./firstCustomerSurface";
import {
  FIRST_CUSTOMER_AGENT_OS_TAB_IDS,
  FIRST_CUSTOMER_CRM_PROFILE_TABS,
  FIRST_CUSTOMER_LEGACY_REDIRECTS,
  LEGACY_BILLING_PORTAL_HREF,
  LEGACY_INVOICES_HREF,
  firstCustomerAgentRunNoticeKey,
  firstCustomerLegacyRedirect,
  firstCustomerStoresReadyKey,
  firstCustomerWorkspaceBadgeKey,
  isFirstCustomerAgentOsTab,
  isFirstCustomerCrmProfileTab,
  isFirstCustomerMarketplaceInstallAllowed,
} from "./firstCustomerHardening";
import { FIRST_CUSTOMER_AGENT_TOOL_IDS } from "@/features/agents/tools";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";

const ROOT = path.resolve(__dirname, "../../..");

describe("first-customer Day 7 hardening", () => {
  it("keeps CRM profile tabs off the legacy Projects module", () => {
    expect(FIRST_CUSTOMER_CRM_PROFILE_TABS).toEqual([
      "overview",
      "contacts",
      "documents",
      "invoices",
      "activity",
      "notes",
      "settings",
    ]);
    expect(isFirstCustomerCrmProfileTab("projects")).toBe(false);
    expect(isFirstCustomerCrmProfileTab("invoices")).toBe(true);
    const profile = readFileSync(
      path.join(ROOT, "app/components/crm/enterprise/CrmCustomerProfile.tsx"),
      "utf8",
    );
    expect(profile).toContain("FIRST_CUSTOMER_CRM_PROFILE_TABS");
    expect(profile).toContain("isFirstCustomerCrmProfileTab");
    expect(profile).not.toContain('router.push("/dashboard/projects")');
    expect(profile).not.toContain("`/dashboard/projects/${project.id}`");
    expect(profile).not.toContain("ProjectsTab");
  });

  it("does not label a database CRM workspace as local stores ready", () => {
    expect(firstCustomerWorkspaceBadgeKey(true)).toBe(
      "dashboard.overview.workspaceBadge",
    );
    expect(firstCustomerWorkspaceBadgeKey(false)).toBe(
      "dashboard.activity.localBadge",
    );
    expect(firstCustomerStoresReadyKey(true)).toBe(
      "dashboard.overview.clientShell.crmReady",
    );
    expect(firstCustomerStoresReadyKey(false)).toBe(
      "dashboard.overview.clientShell.storesReady",
    );
    const overview = readFileSync(
      path.join(ROOT, "app/components/dashboard/BusinessOverview.tsx"),
      "utf8",
    );
    expect(overview).toContain("firstCustomerWorkspaceBadgeKey");
    expect(overview).toContain("firstCustomerStoresReadyKey");
    expect(overview).toContain("isCrmDatabaseMode");
  });

  it("does not send first-customer settings to the legacy billing portal", () => {
    expect(LEGACY_BILLING_PORTAL_HREF).toBe("/dashboard/billing");
    expect(LEGACY_INVOICES_HREF).toBe("/dashboard/invoices");
    expect(HIDDEN_PRIMARY_NAV_HREFS).toContain("/dashboard/billing");
    expect(HIDDEN_PRIMARY_NAV_HREFS).toContain("/dashboard/invoices");
    const settings = readFileSync(
      path.join(ROOT, "app/components/settings/SettingsPanels.tsx"),
      "utf8",
    );
    expect(settings).not.toContain('href="/dashboard/billing"');
    expect(settings).not.toContain('href="/dashboard/ai"');
    expect(settings).not.toContain("AccountBillingSection");
    expect(settings).toContain("settings.billing.unavailable");
    expect(settings).not.toContain("API_KEYS");
    expect(settings).not.toContain("AUDIT_LOGS");
    expect(settings).not.toContain('href="/dashboard/integrations"');
    expect(settings).toContain("/dashboard/finance");
    expect(settings).toContain("/dashboard/settings/finance");
    expect(settings).toContain("settings.billing.notFinanceNotice");
    expect(settings).toContain("settings.integrations.emptyTitle");
    expect(settings).not.toContain("SETTINGS_INTEGRATIONS");
    const billing = readFileSync(
      path.join(ROOT, "features/saas/components/AccountBillingSection.tsx"),
      "utf8",
    );
    expect(billing).not.toContain('href="/dashboard/billing"');
    expect(billing).toContain('href="/pricing"');
    const invoices = readFileSync(
      path.join(ROOT, "app/dashboard/invoices/page.tsx"),
      "utf8",
    );
    expect(invoices).toContain('firstCustomerLegacyRedirect("/dashboard/invoices")');
    expect(invoices).not.toContain('href="/dashboard/billing"');
    expect(firstCustomerLegacyRedirect("/dashboard/invoices")).toBe(
      "/dashboard/finance",
    );
    expect(firstCustomerLegacyRedirect("/dashboard/billing")).toBe(
      "/dashboard/settings#billing",
    );
    expect(FIRST_CUSTOMER_LEGACY_REDIRECTS["/dashboard/customers"]).toBe(
      "/dashboard/crm",
    );
    expect(FIRST_CUSTOMER_LEGACY_REDIRECTS["/dashboard/ai"]).toBe(
      "/dashboard/agents",
    );
    expect(FIRST_CUSTOMER_LEGACY_REDIRECTS["/dashboard/email"]).toBe(
      "/dashboard/settings#team",
    );
    expect(FIRST_CUSTOMER_LEGACY_REDIRECTS["/dashboard/memory"]).toBe(
      "/dashboard/agents",
    );
  });

  it("does not report simulated Agent success on the customer-facing run path", () => {
    expect(firstCustomerAgentRunNoticeKey("blocked")).toBe(
      "agents.notice.approvalRequired",
    );
    expect(firstCustomerAgentRunNoticeKey("failed")).toBe(
      "agents.notice.taskFailed",
    );
    expect(firstCustomerAgentRunNoticeKey("completed")).toBe(
      "agents.notice.runFinished",
    );
    expect(FIRST_CUSTOMER_AGENT_OS_TAB_IDS).toEqual([
      "dashboard",
      "operations",
      "registry",
      "marketplace",
      "monitor",
      "history",
      "memory",
      "knowledge",
      "tools",
      "settings",
    ]);
    expect(isFirstCustomerAgentOsTab("creative")).toBe(false);
    expect(isFirstCustomerAgentOsTab("growth")).toBe(false);
    expect(isFirstCustomerAgentOsTab("operations")).toBe(true);
    const os = readFileSync(
      path.join(ROOT, "features/agents/components/AgentOperatingSystem.tsx"),
      "utf8",
    );
    expect(os).toContain("firstCustomerAgentRunNoticeKey");
    expect(os).toContain("FIRST_CUSTOMER_AGENT_OS_TAB_IDS");
    expect(os).toContain("isCustomerFacingAgentTool");
    expect(os).not.toContain('t("agents.notice.simulatedRun"');
    expect(os).not.toContain('href="/dashboard/ai"');
    expect(os).toContain("agents.dashboard.healthy");
    expect(os).toContain("agents.dashboard.tasksTodayCount");
    expect(os).toContain("isFirstCustomerMarketplaceInstallAllowed");
    expect(os).toContain("agents.marketplace.unavailable");
    expect(isFirstCustomerMarketplaceInstallAllowed(["crm", "email"])).toBe(true);
    expect(isFirstCustomerMarketplaceInstallAllowed(["finance"])).toBe(true);
    expect(isFirstCustomerMarketplaceInstallAllowed(["creative", "website"])).toBe(
      false,
    );
    expect(FIRST_CUSTOMER_AGENT_TOOL_IDS).toEqual(["crm", "finance"]);
    const enAgents = JSON.parse(
      readFileSync(path.join(ROOT, "app/lib/i18n/messages/en/agents.json"), "utf8"),
    ) as { dashboard: { emptyDescription: string } };
    expect(enAgents.dashboard.emptyDescription.toLowerCase()).not.toContain(
      "simulated",
    );
  });

  it("keeps Days 1–6 first-customer routes and production gate intact", () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/dashboard",
      "/dashboard/crm",
      "/dashboard/finance",
      "/dashboard/agents",
      "/dashboard/settings",
    ]);
    expect(
      existsSync(path.join(ROOT, "app/lib/workspace/firstCustomerAgentCrm.ts")),
    ).toBe(true);
    expect(
      existsSync(path.join(ROOT, "app/lib/workspace/firstCustomerInvoiceUx.ts")),
    ).toBe(true);
    expect(
      existsSync(path.join(ROOT, "app/lib/workspace/firstCustomerTeamEmail.ts")),
    ).toBe(true);
    const gate = evaluateFirstCustomerProductionGate(
      {
        runtime: "production",
        nodeEnv: "production",
        authRequired: true,
        authMode: "server",
        crmPersistence: "database",
        agentOsPersistence: "server",
        emailProvider: "http",
        emailDeliveryConfigured: true,
        useMocks: false,
      },
      { forceEnforce: true },
    );
    expect(gate.enforced).toBe(true);
    expect(gate.ready).toBe(true);
    expect(gate.issues).toEqual([]);
  });
});
