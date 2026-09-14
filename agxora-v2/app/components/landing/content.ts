/**
 * Landing structure — labels live in i18n landing catalogs.
 */

export const LANDING_NAV = [
  { href: "#product", messageKey: "landing.nav.product" },
  { href: "#platform", messageKey: "landing.nav.platform" },
  { href: "#connected", messageKey: "landing.nav.integrations" },
  { href: "/pricing", messageKey: "landing.nav.pricing" },
  { href: "/contact-sales", messageKey: "landing.nav.sales" },
  { href: "#start", messageKey: "landing.nav.getStarted" },
] as const;

export const LANDING_TRUST_KEYS = [
  "unified",
  "intelligence",
  "clarity",
  "path",
  "marketing",
  "operations",
] as const;

export const LANDING_HERO_CHIPS = [
  "ai",
  "secure",
  "unified",
  "intelligence",
  "marketing",
  "operations",
] as const;

export const LANDING_GLOBE_TAGS = [
  "customers",
  "growth",
  "automation",
  "success",
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

export const LANDING_AGENT_STEPS = [
  "request",
  "plan",
  "approval",
  "execution",
  "confirmation",
  "audit",
] as const;

export const LANDING_AUTOMATION_KEYS = [
  "governed",
  "capabilities",
  "confirmation",
] as const;

export const LANDING_SECURITY_KEYS = [
  "approval",
  "design",
  "audit",
] as const;

export const LANDING_USE_CASE_KEYS = [
  "founder",
  "operations",
  "marketing",
  "support",
] as const;
