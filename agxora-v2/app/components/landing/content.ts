/**
 * Landing structure — labels live in i18n landing catalogs.
 */

export const LANDING_NAV = [
  { href: "#product", messageKey: "landing.nav.product" },
  { href: "#platform", messageKey: "landing.nav.platform" },
  { href: "/pricing", messageKey: "landing.nav.pricing" },
  { href: "/contact-sales", messageKey: "landing.nav.sales" },
  { href: "#start", messageKey: "landing.nav.getStarted" },
] as const;

export const LANDING_TRUST_KEYS = [
  "unified",
  "intelligence",
  "clarity",
  "path",
] as const;

/** Narrative bands — visual modifiers reuse existing CSS keys. */
export const LANDING_STORY = [
  { id: "fragmented", visual: "integrations" },
  { id: "connect", visual: "automation" },
  { id: "understand", visual: "ai" },
  { id: "execute", visual: "analytics" },
] as const;

export const LANDING_PREVIEW_MODULES = [
  "moduleCustomers",
  "moduleFinance",
  "moduleDocuments",
  "moduleAi",
] as const;
