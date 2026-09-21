/**
 * Day 7 first-customer hardening helpers.
 *
 * Days 1–6 already wired real CRM, Finance, Agent, Team, and email.
 * These helpers keep leftover mock/legacy surfaces off the customer journey.
 */

export const FIRST_CUSTOMER_CRM_PROFILE_TABS = [
  "overview",
  "contacts",
  "documents",
  "invoices",
  "activity",
  "notes",
  "settings",
] as const;

export type FirstCustomerCrmProfileTab =
  (typeof FIRST_CUSTOMER_CRM_PROFILE_TABS)[number];

export function isFirstCustomerCrmProfileTab(
  value: string,
): value is FirstCustomerCrmProfileTab {
  return (FIRST_CUSTOMER_CRM_PROFILE_TABS as readonly string[]).includes(value);
}

export function firstCustomerWorkspaceBadgeKey(
  crmDatabaseMode: boolean,
): "dashboard.overview.workspaceBadge" | "dashboard.activity.localBadge" {
  return crmDatabaseMode
    ? "dashboard.overview.workspaceBadge"
    : "dashboard.activity.localBadge";
}

export function firstCustomerStoresReadyKey(
  crmDatabaseMode: boolean,
): "dashboard.overview.clientShell.crmReady" | "dashboard.overview.clientShell.storesReady" {
  return crmDatabaseMode
    ? "dashboard.overview.clientShell.crmReady"
    : "dashboard.overview.clientShell.storesReady";
}

/** Legacy SaaS billing portal is not the first-customer Finance path. */
export const LEGACY_BILLING_PORTAL_HREF = "/dashboard/billing" as const;

/** Leftover invoices empty page — real invoices live in Finance. */
export const LEGACY_INVOICES_HREF = "/dashboard/invoices" as const;

export const FIRST_CUSTOMER_AGENT_OS_TAB_IDS = [
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
] as const;

export type FirstCustomerAgentOsTab = (typeof FIRST_CUSTOMER_AGENT_OS_TAB_IDS)[number];

export function isFirstCustomerAgentOsTab(
  value: string,
): value is FirstCustomerAgentOsTab {
  return (FIRST_CUSTOMER_AGENT_OS_TAB_IDS as readonly string[]).includes(value);
}

export function firstCustomerAgentRunNoticeKey(
  status: string,
): "agents.notice.approvalRequired" | "agents.notice.taskFailed" | "agents.notice.runFinished" {
  if (status === "blocked") return "agents.notice.approvalRequired";
  if (status === "failed") return "agents.notice.taskFailed";
  return "agents.notice.runFinished";
}

/** Install is only allowed when the agent actually exposes CRM or Finance tools. */
export function isFirstCustomerMarketplaceInstallAllowed(
  tools: readonly string[],
): boolean {
  return tools.some((id) =>
    (["crm", "finance"] as readonly string[]).includes(id),
  );
}

export const FIRST_CUSTOMER_LEGACY_REDIRECTS = {
  "/dashboard/customers": "/dashboard/crm",
  "/dashboard/invoices": "/dashboard/finance",
  "/dashboard/ai": "/dashboard/agents",
  "/dashboard/email": "/dashboard/settings#team",
  "/dashboard/billing": "/dashboard/settings#billing",
} as const;

export type FirstCustomerLegacyRedirectHref =
  keyof typeof FIRST_CUSTOMER_LEGACY_REDIRECTS;

export function firstCustomerLegacyRedirect(
  href: FirstCustomerLegacyRedirectHref,
): (typeof FIRST_CUSTOMER_LEGACY_REDIRECTS)[FirstCustomerLegacyRedirectHref] {
  return FIRST_CUSTOMER_LEGACY_REDIRECTS[href];
}
