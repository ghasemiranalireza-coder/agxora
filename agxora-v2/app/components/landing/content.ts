/**
 * Phase 33 — conversion-first landing copy.
 */

export const LANDING_NAV = [
  { href: "#product", label: "Product" },
  { href: "#platform", label: "Platform" },
  { href: "#start", label: "Get started" },
] as const;

/** Generic trust indicators — no invented customer logos. */
export const LANDING_TRUST_SIGNALS = [
  { title: "Enterprise Ready", detail: "Built for serious operators" },
  { title: "AI Powered", detail: "Intelligence across every workflow" },
  { title: "Built for Scale", detail: "From first team to full org" },
  { title: "Secure by Design", detail: "Guarded routes and sessions" },
] as const;

export const LANDING_FEATURES = [
  {
    id: "ai",
    title: "AI",
    statement: "Governed intelligence across every workspace.",
    detail: "Decisions grounded in your data — not demos.",
  },
  {
    id: "automation",
    title: "Automation",
    statement: "Durable workflows that move the business.",
    detail: "From trigger to outcome with clear control.",
  },
  {
    id: "analytics",
    title: "Analytics",
    statement: "Live signal for operators who ship.",
    detail: "See what matters. Act without noise.",
  },
  {
    id: "integrations",
    title: "Integrations",
    statement: "Connect the systems you already run.",
    detail: "One platform. No fractured stack.",
  },
] as const;
