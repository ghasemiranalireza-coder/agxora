/**
 * Phase 3C — Login with Amazon token refresh (server-only).
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import { AMAZON_LWA_TOKEN_URL, getAmazonLwaConfig } from "./config";

let fetchOverride: typeof fetch | null = null;

export function setAmazonLwaFetchForTests(value: typeof fetch | null): void {
  fetchOverride = value;
}

function lwaFetch(): typeof fetch {
  return fetchOverride ?? fetch;
}

export async function refreshAmazonAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt?: Date; invalidGrant?: boolean }> {
  const config = getAmazonLwaConfig();
  if (!config) {
    throw new PersistenceError("misconfigured", "Amazon Seller OAuth is not configured");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const response = await lwaFetch()(AMAZON_LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  if (!response.ok) {
    let invalidGrant = false;
    try {
      const payload = (await response.json()) as { error?: string };
      invalidGrant = payload.error === "invalid_grant";
    } catch {
      invalidGrant = false;
    }
    if (invalidGrant) {
      return { accessToken: "", invalidGrant: true };
    }
    throw new PersistenceError("forbidden", "OAuth token refresh failed", {
      details: [{ field: "refresh", message: "token_refresh_failed" }],
    });
  }
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!payload.access_token) {
    throw new PersistenceError("forbidden", "OAuth token refresh failed", {
      details: [{ field: "refresh", message: "missing_access_token" }],
    });
  }
  const expiresAt =
    typeof payload.expires_in === "number"
      ? new Date(Date.now() + payload.expires_in * 1000)
      : undefined;
  return { accessToken: payload.access_token, expiresAt };
}
