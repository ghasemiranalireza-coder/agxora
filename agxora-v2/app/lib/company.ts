/**
 * Public company contact placeholders for launch surfaces.
 * Replace with production legal entity details before go-live.
 */

export const COMPANY = {
  name: "AGXORA",
  legalName: "AGXORA GmbH",
  tagline: "AI Business Operating System",
  siteUrl: "https://agxora.app",
  email: {
    company: "hello@agxora.app",
    support: "support@agxora.app",
    sales: "sales@agxora.app",
    privacy: "privacy@agxora.app",
  },
  address: {
    line1: "Friedrichstraße 100",
    line2: "10117 Berlin",
    country: "Germany",
  },
  lastUpdated: "August 4, 2026",
} as const;

export function formatCompanyAddress(): string {
  return `${COMPANY.address.line1}, ${COMPANY.address.line2}, ${COMPANY.address.country}`;
}
