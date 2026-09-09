/**
 * Phase 3C — official Amazon Selling Partner API configuration (server-only).
 * Never expose LWA client secrets to the browser.
 */

import "server-only";

export type AmazonSpApiRegion = "NA" | "EU" | "FE";

export type AmazonLwaConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly applicationId: string;
  readonly redirectUri: string;
  readonly region: AmazonSpApiRegion;
  readonly sellerCentralOrigin: string;
  readonly spApiEndpoint: string;
  readonly draftApp: boolean;
};

const REGION_ENDPOINTS: Record<
  AmazonSpApiRegion,
  { readonly spApi: string; readonly sandbox: string; readonly sellerCentral: string }
> = {
  NA: {
    spApi: "https://sellingpartnerapi-na.amazon.com",
    sandbox: "https://sandbox.sellingpartnerapi-na.amazon.com",
    sellerCentral: "https://sellercentral.amazon.com",
  },
  EU: {
    spApi: "https://sellingpartnerapi-eu.amazon.com",
    sandbox: "https://sandbox.sellingpartnerapi-eu.amazon.com",
    sellerCentral: "https://sellercentral.amazon.de",
  },
  FE: {
    spApi: "https://sellingpartnerapi-fe.amazon.com",
    sandbox: "https://sandbox.sellingpartnerapi-fe.amazon.com",
    sellerCentral: "https://sellercentral.amazon.co.jp",
  },
};

export function isAmazonSellerEnabled(): boolean {
  const raw = process.env.AGXORA_AMAZON_SELLER_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export type AmazonSpApiEnvironment = "sandbox" | "production";

export function isAmazonSpApiSandbox(): boolean {
  const raw = process.env.AGXORA_AMAZON_SP_API_SANDBOX?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Official hosted SP-API sandbox vs production. Never invents Amazon data. */
export function getAmazonSpApiEnvironment(): AmazonSpApiEnvironment {
  return isAmazonSpApiSandbox() ? "sandbox" : "production";
}

function parseRegion(raw: string | undefined): AmazonSpApiRegion {
  const value = raw?.trim().toUpperCase();
  if (value === "EU" || value === "FE" || value === "NA") return value;
  return "NA";
}

export function getAmazonLwaConfig(): AmazonLwaConfig | null {
  const clientId = process.env.AGXORA_AMAZON_LWA_CLIENT_ID?.trim();
  const clientSecret = process.env.AGXORA_AMAZON_LWA_CLIENT_SECRET?.trim();
  const applicationId = process.env.AGXORA_AMAZON_SP_API_APPLICATION_ID?.trim();
  const redirectUri = process.env.AGXORA_AMAZON_SP_API_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !applicationId || !redirectUri) return null;
  const region = parseRegion(process.env.AGXORA_AMAZON_SP_API_REGION);
  const endpoints = REGION_ENDPOINTS[region];
  const sellerCentralOrigin =
    process.env.AGXORA_AMAZON_SELLER_CENTRAL_ORIGIN?.trim() ||
    endpoints.sellerCentral;
  const draftRaw = process.env.AGXORA_AMAZON_SP_API_DRAFT?.trim().toLowerCase();
  return {
    clientId,
    clientSecret,
    applicationId,
    redirectUri,
    region,
    sellerCentralOrigin: sellerCentralOrigin.replace(/\/$/, ""),
    spApiEndpoint: isAmazonSpApiSandbox() ? endpoints.sandbox : endpoints.spApi,
    draftApp: draftRaw !== "0" && draftRaw !== "false" && draftRaw !== "no",
  };
}

export function isAmazonSellerFullyConfigured(): boolean {
  return isAmazonSellerEnabled() && Boolean(getAmazonLwaConfig());
}

export const AMAZON_LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
export const AMAZON_USER_AGENT = "AGXORA/0.39.0 (Language=TypeScript)";

const AMAZON_CALLBACK_HOSTS = new Set([
  "amazon.com",
  "www.amazon.com",
  "sellercentral.amazon.com",
  "sellercentral.amazon.de",
  "sellercentral.amazon.co.uk",
  "sellercentral.amazon.fr",
  "sellercentral.amazon.it",
  "sellercentral.amazon.es",
  "sellercentral.amazon.co.jp",
  "sellercentral.amazon.com.au",
  "sellercentral.amazon.ca",
  "sellercentral.amazon.com.mx",
  "sellercentral.amazon.ae",
  "sellercentral.amazon.sg",
  "sellercentral.amazon.com.br",
  "sellercentral.amazon.in",
  "sellercentral.amazon.nl",
  "sellercentral.amazon.pl",
  "sellercentral.amazon.se",
  "sellercentral.amazon.com.be",
  "sellercentral.amazon.com.tr",
]);

export function isAllowedAmazonCallbackUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!AMAZON_CALLBACK_HOSTS.has(url.hostname.toLowerCase())) return false;
    return url.pathname.startsWith("/apps/authorize/confirm/");
  } catch {
    return false;
  }
}
