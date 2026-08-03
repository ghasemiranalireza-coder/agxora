/**
 * Phase 31 landing copy — sparse, enterprise, 5-second readable.
 */

export const LANDING_NAV = [
  { href: "#product", label: "Product" },
  { href: "#platform", label: "Platform" },
  { href: "#start", label: "Get started" },
] as const;

export const LANDING_TRUST_LOGOS = [
  "Northline",
  "Helix",
  "Cascade",
  "Vertex",
  "Aperture",
  "Lumen",
] as const;

export const LANDING_STATS = [
  { value: "Global", label: "Intelligence layer" },
  { value: "Unified", label: "Operating surface" },
  { value: "Secure", label: "Enterprise posture" },
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
