/**
 * Landing v2 blueprint copy — marketing surface only.
 */

export const LANDING_NAV = [
  { href: "#product", label: "Product" },
  { href: "#pillars", label: "Platform" },
  { href: "#security", label: "Security" },
  { href: "#start", label: "Start" },
] as const;

export const LANDING_TRUST_LOGOS = [
  "Northline",
  "Helix Ops",
  "Cascade",
  "Vertex Co",
  "Aperture",
  "Lumen Group",
] as const;

export const LANDING_PILLARS = [
  { title: "AI", detail: "Governed intelligence" },
  { title: "Automation", detail: "Durable workflows" },
  { title: "Analytics", detail: "Live operational signal" },
  { title: "Integrations", detail: "Connected systems" },
] as const;

export const LANDING_WHY = [
  {
    title: "Enterprise Scale",
    detail: "Built for multi-workspace operators and growing teams.",
  },
  {
    title: "AI Native",
    detail: "Intelligence woven through every surface — not bolted on.",
  },
  {
    title: "Built for Growth",
    detail: "From first workspace to full operating system.",
  },
] as const;

export const LANDING_SECURITY = [
  {
    title: "Security",
    detail: "Session gates, route isolation, and production hardening.",
  },
  {
    title: "Compliance",
    detail: "Architecture prepared for enterprise assurance programs.",
  },
  {
    title: "Privacy",
    detail: "Sensitive data boundaries and redaction-ready logging.",
  },
] as const;

export const LANDING_FOOTER = {
  product: [
    { href: "#product", label: "Product" },
    { href: "#pillars", label: "Platform" },
    { href: "/login", label: "Sign in" },
  ],
  company: [
    { href: "#start", label: "Pricing" },
    { href: "#security", label: "Security" },
    { href: "mailto:hello@agxora.app", label: "Contact" },
  ],
  legal: [
    { href: "#security", label: "Privacy" },
    { href: "#security", label: "Terms" },
    { href: "#product", label: "Docs" },
  ],
} as const;
