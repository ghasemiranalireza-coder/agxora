/**
 * Phase 71 — official Gmail / Google Workspace OAuth (server-only).
 * Tokens never leave this module except encrypted at rest.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getGmailOAuthConfig } from "../config";
import {
  createPkcePair,
  upsertSocialCredentialForActor,
  revokeSocialCredentialForActor,
} from "../credentials";
import { consumeSocialOAuthState, issueSocialOAuthState } from "./state";

export type GmailConnectResult = {
  readonly authorizationUrl: string;
};

export type GmailCallbackResult = {
  readonly connected: true;
  readonly emailAddress?: string;
  readonly redirectPath?: string;
};

function requireGmailOAuthConfigured(): NonNullable<
  ReturnType<typeof getGmailOAuthConfig>
> {
  const config = getGmailOAuthConfig();
  if (!config) {
    throw new PersistenceError("misconfigured", "Gmail OAuth is not configured", {
      details: [
        { field: "gmail", message: "oauth_not_configured" },
        {
          field: "env",
          message:
            "AGXORA_GMAIL_OAUTH_CLIENT_ID, AGXORA_GMAIL_OAUTH_CLIENT_SECRET, AGXORA_GMAIL_OAUTH_REDIRECT_URI",
        },
      ],
    });
  }
  return config;
}

export async function beginGmailOAuthForActor(
  actor: Actor,
  redirectPath?: string,
): Promise<GmailConnectResult> {
  const config = requireGmailOAuthConfigured();
  const pkce = createPkcePair();
  const issued = await issueSocialOAuthState({
    actor,
    platform: "gmail",
    codeVerifier: pkce.verifier,
    redirectPath,
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state: issued.state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  });

  return {
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

export async function completeGmailOAuthForActor(
  actor: Actor,
  input: { readonly code: string; readonly state: string },
  fetchImpl: typeof fetch = fetch,
): Promise<GmailCallbackResult> {
  const config = requireGmailOAuthConfigured();
  const consumed = await consumeSocialOAuthState({
    actor,
    platform: "gmail",
    state: input.state,
  });

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code_verifier: consumed.codeVerifier,
  });

  const tokenResponse = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
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

  let emailAddress: string | undefined;
  try {
    const profileResponse = await fetchImpl(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as {
        emailAddress?: string;
      };
      emailAddress = profile.emailAddress;
    }
  } catch {
    // Profile is optional; connection still stores encrypted tokens.
  }

  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

  await upsertSocialCredentialForActor(actor, "gmail", {
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
    },
    scopes: [...config.scopes],
    externalAccountId: emailAddress,
    externalAccountName: emailAddress,
    accessTokenExpiresAt: expiresAt,
  });

  return {
    connected: true,
    emailAddress,
    redirectPath: consumed.redirectPath,
  };
}

export async function disconnectGmailForActor(actor: Actor): Promise<void> {
  await revokeSocialCredentialForActor(actor, "gmail");
}
