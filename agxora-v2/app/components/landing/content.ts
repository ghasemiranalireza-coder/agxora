/**
 * Landing page content constants — copy only, no app routing changes.
 */

export const LANDING_NAV = [
  { href: "#platform", label: "Platform" },
  { href: "#features", label: "Features" },
  { href: "#trust", label: "Trust" },
  { href: "#start", label: "Start" },
] as const;

export const LANDING_VALUE_PROPS = [
  {
    id: "ai",
    title: "Enterprise AI",
    description:
      "Operate with a governed AI layer built for decisions, not demos — grounded in your workspace data.",
    href: "/onboarding",
    cta: "Start Free",
    icon: "ai",
  },
  {
    id: "automation",
    title: "Automation",
    description:
      "Design durable workflows that move work across teams with auditability and control.",
    href: "/login",
    cta: "Explore Platform",
    icon: "automation",
  },
  {
    id: "analytics",
    title: "Analytics",
    description:
      "See signal, not noise — live operational intelligence across customers, finance, and delivery.",
    href: "/onboarding",
    cta: "Request Demo",
    icon: "analytics",
  },
  {
    id: "security",
    title: "Security",
    description:
      "Session isolation, route guards, and production hardening prepared for enterprise deployment.",
    href: "/login",
    cta: "Book Consultation",
    icon: "security",
  },
  {
    id: "integrations",
    title: "Integrations",
    description:
      "Connect the systems you already run. Extend AGXORA without fracturing your stack.",
    href: "/onboarding",
    cta: "Explore Platform",
    icon: "integrations",
  },
  {
    id: "identity",
    title: "Identity",
    description:
      "Roles, permissions, and workspace boundaries designed for multi-organization SaaS.",
    href: "/login",
    cta: "Start Free",
    icon: "identity",
  },
  {
    id: "intelligence",
    title: "Intelligence",
    description:
      "An enterprise intelligence center that compounds insight across agents, memory, and outcomes.",
    href: "/onboarding",
    cta: "Request Demo",
    icon: "intelligence",
  },
] as const;

export const LANDING_FEATURES = [
  {
    title: "Command Center",
    description: "One operating surface for workspaces, agents, and live business context.",
  },
  {
    title: "AI Agent OS",
    description: "Register, govern, and orchestrate agents with clear operational boundaries.",
  },
  {
    title: "Workflow Engine",
    description: "Automate cross-module processes with durable, inspectable runs.",
  },
  {
    title: "Integration Fabric",
    description: "API-ready connectors and an ecosystem architecture for enterprise systems.",
  },
  {
    title: "Commercial Layer",
    description: "Billing, plans, and SaaS infrastructure prepared for launch.",
  },
  {
    title: "Production Hardening",
    description: "Health checks, security headers, observability stubs, and launch gates.",
  },
] as const;

export const LANDING_METRICS = [
  { label: "Enterprise Ready", value: "Production", detail: "Hardened for launch" },
  { label: "AI Powered", value: "Multi-model", detail: "Provider-ready brain" },
  { label: "Automation Engine", value: "Event-driven", detail: "Durable workflows" },
  { label: "Analytics Platform", value: "Live", detail: "Operational signal" },
  { label: "Secure Architecture", value: "Guarded", detail: "Route & session gates" },
] as const;

export const LANDING_TRUST = [
  {
    title: "Enterprise Customers",
    description: "Placeholder for design partners and early enterprise logos.",
  },
  {
    title: "Testimonials",
    description: "Placeholder for operator stories from pilots and launch cohorts.",
  },
  {
    title: "Compliance",
    description: "Architecture prepared for SOC 2 / GDPR programs — policies forthcoming.",
  },
  {
    title: "Security",
    description: "CSP baseline, session validation placeholders, and workspace isolation.",
  },
  {
    title: "Availability",
    description: "Health endpoint and operational readiness for continuous delivery.",
  },
] as const;
