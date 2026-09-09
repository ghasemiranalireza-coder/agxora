/**
 * Phase 3C — official Amazon website authorization (Login with Amazon / SP-API).
 * Tokens stay server-only. Never invent a connected state without token exchange.
 */

import "server-only";

import { randomBytes } from "crypto";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { assertMarketplacePlanAccess } from "@/app/lib/business-agent/entitlements";
import {
  AMAZON_LWA_TOKEN_URL,
  getAmazonLwaConfig,
  isAllowedAmazonCallbackUri,
  isAmazonSellerEnabled,
  type AmazonLwaConfig,
} from "./config";
import {
  revokeSocialCredentialForActor,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import {
  consumeSocialOAuthState,
  findLatestUnconsumedSocialOAuthState,
  issueSocialOAuthState,
} from "@/app/lib/social/oauth/state";

export type AmazonConnectResult = {
  readonly authorizationUrl: string;
};

export type AmazonCallbackResult = {
  readonly connected: true;
  readonly sellingPartnerId: string;
  readonly redirectPath?: string;
};

export type AmazonOAuthHttp = {
  readonly fetch: typeof fetch;
};

let httpOverride: AmazonOAuthHttp | null = null;

export function setAmazonOAuthHttpForTests(http: AmazonOAuthHttp | null): void {
  httpOverride = http;
}

function amazonFetch(): typeof fetch {
  return httpOverride?.fetch ?? fetch;
}

function requireAmazonEnabled(): AmazonLwaConfig {
  if (!isAmazonSellerEnabled()) {
    throw new PersistenceError("misconfigured", "Amazon Seller is disabled", {
      details: [{ field: "amazon_seller", message: "publish_disabled" }],
    });
  }
  const config = getAmazonLwaConfig();
  if (!config) {
    throw new PersistenceError("misconfigured", "Amazon Seller OAuth is not configured", {
      details: [{ field: "amazon_seller", message: "oauth_not_configured" }],
    });
  }
  return config;
}

export async function beginAmazonOAuthForActor(
  actor: Actor,
  redirectPath?: string,
): Promise<AmazonConnectResult> {
  assertMarketplacePlanAccess(actor.organizationId);
  const config = requireAmazonEnabled();
  const issued = await issueSocialOAuthState({
    actor,
    platform: "amazon",
    codeVerifier: randomBytes(32).toString("base64url"),
    redirectPath,
  });
  const params = new URLSearchParams({
    application_id: config.applicationId,
    state: issued.state,
  });
  if (config.draftApp) {
    params.set("version", "beta");
  }
  return {
    authorizationUrl: `${config.sellerCentralOrigin}/apps/authorize/consent?${params.toString()}`,
  };
}

export async function continueAmazonOAuthLoginForActor(
  actor: Actor,
  input: {
    readonly amazonCallbackUri: string;
    readonly amazonState: string;
    readonly sellingPartnerId: string;
    readonly version?: string | null;
  },
): Promise<{ readonly amazonRedirectUrl: string }> {
  assertMarketplacePlanAccess(actor.organizationId);
  const config = requireAmazonEnabled();
  if (!isAllowedAmazonCallbackUri(input.amazonCallbackUri)) {
    throw new PersistenceError("forbidden", "Invalid Amazon callback URI", {
      details: [{ field: "amazon_callback_uri", message: "rejected_host" }],
    });
  }
  if (!input.amazonState.trim() || !input.sellingPartnerId.trim()) {
    throw new PersistenceError("validation", "Missing Amazon login parameters");
  }

  const pending = await findLatestUnconsumedSocialOAuthState({
    actor,
    platform: "amazon",
  });
  const payload = JSON.stringify({
    sellingPartnerId: input.sellingPartnerId.trim(),
    amazonState: input.amazonState.trim(),
  });
  const issued = await issueSocialOAuthState({
    actor,
    platform: "amazon",
    codeVerifier: payload,
    redirectPath: pending?.redirectPath ?? "/dashboard/amazon",
  });

  const callback = new URL(input.amazonCallbackUri);
  callback.searchParams.set("amazon_state", input.amazonState.trim());
  callback.searchParams.set("state", issued.state);
  callback.searchParams.set("redirect_uri", config.redirectUri);
  if (config.draftApp || input.version === "beta") {
    callback.searchParams.set("version", "beta");
  }
  return { amazonRedirectUrl: callback.toString() };
}

export async function completeAmazonOAuthForActor(
  actor: Actor,
  input: {
    readonly code: string;
    readonly state: string;
    readonly sellingPartnerId?: string;
  },
): Promise<AmazonCallbackResult> {
  assertMarketplacePlanAccess(actor.organizationId);
  const config = requireAmazonEnabled();
  const consumed = await consumeSocialOAuthState({
    actor,
    platform: "amazon",
    state: input.state,
  });

  let sellingPartnerId = input.sellingPartnerId?.trim() || "";
  try {
    const parsed = JSON.parse(consumed.codeVerifier) as { sellingPartnerId?: string };
    if (!sellingPartnerId && parsed.sellingPartnerId) {
      sellingPartnerId = parsed.sellingPartnerId.trim();
    }
  } catch {
    // Connect-begin states store a random verifier, not JSON.
  }
  if (!sellingPartnerId) {
    throw new PersistenceError(
      "forbidden",
      "Amazon did not return the selling partner id",
      { details: [{ field: "amazon_seller", message: "missing_selling_partner_id" }] },
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const tokenResponse = await amazonFetch()(AMAZON_LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  if (!tokenResponse.ok) {
    throw new PersistenceError("forbidden", "Amazon connection could not be completed", {
      details: [{ field: "code", message: "token_exchange_failed" }],
    });
  }
  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new PersistenceError("forbidden", "Amazon connection could not be completed", {
      details: [{ field: "code", message: "missing_tokens" }],
    });
  }

  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

  await upsertSocialCredentialForActor(actor, "amazon", {
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
    },
    scopes: ["selling_partner_api"],
    externalAccountId: sellingPartnerId,
    externalAccountName: sellingPartnerId,
    accessTokenExpiresAt: expiresAt,
  });

  return {
    connected: true,
    sellingPartnerId,
    redirectPath: consumed.redirectPath,
  };
}

export async function disconnectAmazonForActor(actor: Actor): Promise<void> {
  await revokeSocialCredentialForActor(actor, "amazon");
}
