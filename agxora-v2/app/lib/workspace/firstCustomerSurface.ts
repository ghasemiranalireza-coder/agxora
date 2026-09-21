/**
 * First-customer surface lockdown.
 *
 * Primary navigation and customer CTAs must stay on the Prisma CRM path.
 * Legacy/mock routes remain implemented but are not part of normal navigation.
 */

export const FIRST_CUSTOMER_CUSTOMER_HREF = "/dashboard/crm" as const;
export const FIRST_CUSTOMER_FINANCE_HREF = "/dashboard/finance" as const;
export const FIRST_CUSTOMER_AGENTS_HREF = "/dashboard/agents" as const;
export const FIRST_CUSTOMER_SETTINGS_HREF = "/dashboard/settings" as const;
export const FIRST_CUSTOMER_DASHBOARD_HREF = "/dashboard" as const;

export const HIDDEN_PRIMARY_NAV_HREFS = [
  "/dashboard/customers",
  "/dashboard/projects",
  "/dashboard/analytics",
  "/dashboard/billing",
  "/dashboard/invoices",
  "/dashboard/documents",
  "/dashboard/creator",
  "/dashboard/automation",
  "/dashboard/team",
  "/dashboard/email",
  "/dashboard/ai",
] as const;

export type PrimaryNavItem = {
  readonly labelKey: string;
  readonly href: string;
  readonly path: string;
};

export const PRIMARY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  {
    labelKey: "navigation.dashboard",
    href: FIRST_CUSTOMER_DASHBOARD_HREF,
    path: "M3 12l9-9 9 9 M5 10v9a1 1 0 0 0 1 1h3m6 0h3a1 1 0 0 0 1-1v-9 M9 20v-6h6v6",
  },
  {
    labelKey: "navigation.aiCrm",
    href: FIRST_CUSTOMER_CUSTOMER_HREF,
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    labelKey: "navigation.financeTax",
    href: FIRST_CUSTOMER_FINANCE_HREF,
    path: "M3 21h18 M5 21V10l7-5 7 5v11 M9 21v-6h6v6 M12 5v2",
  },
  {
    labelKey: "navigation.agents",
    href: FIRST_CUSTOMER_AGENTS_HREF,
    path: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  },
  {
    labelKey: "navigation.settings",
    href: FIRST_CUSTOMER_SETTINGS_HREF,
    path: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V10c.2.6.8 1 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  },
] as const;

const FIRST_CUSTOMER_SEARCH_PREFIXES = [
  FIRST_CUSTOMER_DASHBOARD_HREF,
  FIRST_CUSTOMER_CUSTOMER_HREF,
  FIRST_CUSTOMER_FINANCE_HREF,
  FIRST_CUSTOMER_AGENTS_HREF,
  FIRST_CUSTOMER_SETTINGS_HREF,
] as const;

export const FIRST_CUSTOMER_SEARCH_MODULE_KEYS = [
  "dashboard",
  "crm",
  "finance",
  "settings",
] as const;

export function isHiddenPrimaryNavHref(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? href;
  return HIDDEN_PRIMARY_NAV_HREFS.some(
    (hidden) => path === hidden || path.startsWith(`${hidden}/`),
  );
}

export function isFirstCustomerSearchHrefAllowed(href: string): boolean {
  if (href.startsWith("#")) return true;
  if (isHiddenPrimaryNavHref(href)) return false;
  const path = href.split(/[?#]/)[0] ?? href;
  return FIRST_CUSTOMER_SEARCH_PREFIXES.some((allowed) => {
    if (allowed === FIRST_CUSTOMER_DASHBOARD_HREF) {
      return path === allowed;
    }
    return path === allowed || path.startsWith(`${allowed}/`);
  });
}

export function customerCtaHref(): typeof FIRST_CUSTOMER_CUSTOMER_HREF {
  return FIRST_CUSTOMER_CUSTOMER_HREF;
}
