/**
 * Phase 3B — official LinkedIn OAuth connect / callback / disconnect.
 * Tokens stay server-only. Never invent a connected state without token exchange.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getLinkedInOAuthConfig, isLinkedInPublishEnabled } from "../config";
import {
  createPkcePair,
  upsertSocialCredentialForActor,
  revokeSocialCredentialForActor,
} from "../credentials";
import { issueSocialOAuthState, consumeSocialOAuthState } from "./state";

/**
 * Official LinkedIn 3-legged OAuth for web apps uses client_secret and does
 * not accept PKCE on /oauth/v2/authorization. PKCE is a separate native-client
 * product. We still store a verifier in OAuth state for CSRF binding only.
 */

export type LinkedInConnectResult = {
  readonly authorizationUrl: string;
};

export type LinkedInCallbackResult = {
  readonly connected: true;
  readonly displayName?: string;
  readonly memberId: string;
  readonly redirectPath?: string;
};

export type LinkedInUserInfo = {
  readonly sub?: string;
  readonly name?: string;
  readonly email?: string;
};

export type LinkedInOAuthHttp = {
  readonly fetch: typeof fetch;
};

let httpOverride: LinkedInOAuthHttp | null = null;

export function setLinkedInOAuthHttpForTests(http: LinkedInOAuthHttp | null): void {
  httpOverride = http;
}

function linkedInFetch(): typeof fetch {
  return httpOverride?.fetch ?? fetch;
}

function requireLinkedInEnabled(): void {
  if (!isLinkedInPublishEnabled()) {
    throw new PersistenceError("misconfigured", "LinkedIn publish is disabled", {
      details: [{ field: "linkedin", message: "publish_disabled" }],
    });
  }
  if (!getLinkedInOAuthConfig()) {
    throw new PersistenceError("misconfigured", "LinkedIn OAuth is not configured", {
      details: [{ field: "linkedin", message: "oauth_not_configured" }],
    });
  }
}

export async function beginLinkedInOAuthForActor(
  actor: Actor,
  redirectPath?: string,
): Promise<LinkedInConnectResult> {
  requireLinkedInEnabled();
  const config = getLinkedInOAuthConfig()!;
  const pkce = createPkcePair();
  const issued = await issueSocialOAuthState({
    actor,
    platform: "linkedin",
    codeVerifier: pkce.verifier,
    redirectPath,
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: issued.state,
    scope: config.scopes.join(" "),
  });

  return {
    authorizationUrl: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
  };
}

export async function completeLinkedInOAuthForActor(
  actor: Actor,
  input: { readonly code: string; readonly state: string },
): Promise<LinkedInCallbackResult> {
  requireLinkedInEnabled();
  const config = getLinkedInOAuthConfig()!;
  const consumed = await consumeSocialOAuthState({
    actor,
    platform: "linkedin",
    state: input.state,
  });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const tokenResponse = await linkedInFetch()(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!tokenResponse.ok) {
    throw new PersistenceError("forbidden", "OAuth token exchange failed", {
      details: [{ field: "code", message: "token_exchange_failed" }],
    });
  }

  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!tokens.access_token) {
    throw new PersistenceError("forbidden", "OAuth token exchange failed", {
      details: [{ field: "code", message: "missing_access_token" }],
    });
  }

  let memberId: string | undefined;
  let displayName: string | undefined;
  try {
    const profileResponse = await linkedInFetch()(
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as LinkedInUserInfo;
      memberId = profile.sub?.trim() || undefined;
      displayName = profile.name?.trim() || profile.email?.trim() || undefined;
    }
  } catch {
    // Profile metadata is optional; posting still needs a member URN later.
  }

  if (!memberId) {
    throw new PersistenceError(
      "forbidden",
      "LinkedIn did not return the authenticated member id",
      { details: [{ field: "linkedin", message: "missing_member_id" }] },
    );
  }

  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

  await upsertSocialCredentialForActor(actor, "linkedin", {
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
    },
    scopes: [...config.scopes],
    externalAccountId: memberId,
    externalAccountName: displayName,
    accessTokenExpiresAt: expiresAt,
  });

  return {
    connected: true,
    displayName,
    memberId,
    redirectPath: consumed.redirectPath,
  };
}

export async function disconnectLinkedInForActor(actor: Actor): Promise<void> {
  await revokeSocialCredentialForActor(actor, "linkedin");
}
