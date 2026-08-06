/**
 * Public company identity for marketing and legal surfaces.
 * Override via NEXT_PUBLIC_AGXORA_* environment variables for production.
 */

function env(key: string, fallback = ""): string {
  const value = process.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const COMPANY = {
  name: env("NEXT_PUBLIC_AGXORA_COMPANY_NAME", "AGXORA"),
  legalName: env("NEXT_PUBLIC_AGXORA_LEGAL_NAME", "AGXORA"),
  tagline: "AI Business Operating System",
  siteUrl: env("NEXT_PUBLIC_AGXORA_SITE_URL", "https://agxora.app"),
  email: {
    company: env("NEXT_PUBLIC_AGXORA_EMAIL_COMPANY", "hello@agxora.app"),
    support: env("NEXT_PUBLIC_AGXORA_EMAIL_SUPPORT", "support@agxora.app"),
    sales: env("NEXT_PUBLIC_AGXORA_EMAIL_SALES", "sales@agxora.app"),
    privacy: env("NEXT_PUBLIC_AGXORA_EMAIL_PRIVACY", "privacy@agxora.app"),
  },
  address: {
    line1: env("NEXT_PUBLIC_AGXORA_ADDRESS_LINE1"),
    line2: env("NEXT_PUBLIC_AGXORA_ADDRESS_LINE2"),
    country: env("NEXT_PUBLIC_AGXORA_ADDRESS_COUNTRY"),
  },
  register: {
    managingDirector: env("NEXT_PUBLIC_AGXORA_MANAGING_DIRECTOR"),
    court: env("NEXT_PUBLIC_AGXORA_REGISTER_COURT"),
    number: env("NEXT_PUBLIC_AGXORA_REGISTER_NUMBER"),
    vatId: env("NEXT_PUBLIC_AGXORA_VAT_ID"),
  },
  lastUpdated: env("NEXT_PUBLIC_AGXORA_LEGAL_UPDATED", "August 6, 2026"),
} as const;

export function formatCompanyAddress(): string {
  const parts = [
    COMPANY.address.line1,
    COMPANY.address.line2,
    COMPANY.address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Address available on request";
}

export function hasConfiguredAddress(): boolean {
  return Boolean(COMPANY.address.line1 && COMPANY.address.country);
}
