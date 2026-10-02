/**
 * Instagram Login configuration for one professional account.
 * Secrets stay in server environment variables. Nothing here is public.
 */

import "server-only";

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
] as const;

export const INSTAGRAM_GRAPH_HOST = "https://graph.instagram.com";

export type InstagramOAuthConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly graphVersion: string;
  readonly publicBaseUrl: string;
};

export function isInstagramPublishConfigured(): boolean {
  return getInstagramOAuthConfig() !== null;
}

export function instagramPublishAvailability(): "LIVE" | "BLOCKED" {
  return isInstagramPublishConfigured() ? "LIVE" : "BLOCKED";
}

export function instagramPublishEnabled(): boolean {
  const raw = process.env.AGXORA_INSTAGRAM_PUBLISH_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getInstagramOAuthConfig(): InstagramOAuthConfig | null {
  if (!instagramPublishEnabled()) return null;
  const clientId = process.env.AGXORA_INSTAGRAM_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.AGXORA_INSTAGRAM_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.AGXORA_INSTAGRAM_OAUTH_REDIRECT_URI?.trim();
  const publicBaseUrl = process.env.AGXORA_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (!clientId || !clientSecret || !redirectUri || !publicBaseUrl) return null;
  if (!redirectUri.startsWith("https://") || !publicBaseUrl.startsWith("https://")) return null;
  const graphVersion = process.env.AGXORA_INSTAGRAM_GRAPH_VERSION?.trim() || "v21.0";
  if (!/^v\d+\.\d+$/.test(graphVersion)) return null;
  return { clientId, clientSecret, redirectUri, graphVersion, publicBaseUrl };
}
