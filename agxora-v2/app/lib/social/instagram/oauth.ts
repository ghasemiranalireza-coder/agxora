/**
 * Instagram Login connect, callback, and disconnect.
 * Tokens are encrypted by the existing social credential store.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getInstagramOAuthConfig, INSTAGRAM_SCOPES } from "./config";
import { exchangeInstagramCode, readInstagramAccount } from "./client";
import {
  createPkcePair,
  revokeSocialCredentialForActor,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import { consumeSocialOAuthState, issueSocialOAuthState } from "@/app/lib/social/oauth/state";
import { resolveSafeInternalPath } from "@/app/lib/security/safeInternalPath";

const FALLBACK_PATH = "/dashboard";

function requireConfig() {
  const config = getInstagramOAuthConfig();
  if (!config) {
    throw new PersistenceError("misconfigured", "Instagram publishing is not configured", {
      details: [{ field: "instagram", message: "oauth_not_configured" }],
    });
  }
  return config;
}

export async function beginInstagramOAuthForActor(
  actor: Actor,
  redirectPath: string | undefined,
  scopes: readonly string[],
): Promise<{ readonly authorizationUrl: string }> {
  const config = requireConfig();
  const requested = scopes.length > 0 ? scopes : INSTAGRAM_SCOPES;
  if (!requested.includes("instagram_business_content_publish") || !requested.includes("instagram_business_basic")) {
    throw new PersistenceError("validation", "Instagram publish permission is required.", {
      details: [{ field: "authorization", message: "publish_scope_required" }],
    });
  }
  const pkce = createPkcePair();
  const issued = await issueSocialOAuthState({
    actor,
    platform: "instagram",
    codeVerifier: pkce.verifier,
    redirectPath: resolveSafeInternalPath(redirectPath, FALLBACK_PATH),
  });
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: requested.join(","),
    state: issued.state,
  });
  return { authorizationUrl: `https://www.instagram.com/oauth/authorize?${params.toString()}` };
}

export async function completeInstagramOAuthForActor(
  actor: Actor,
  input: { readonly code: string; readonly state: string },
): Promise<{ readonly username: string; readonly accountId: string; readonly scopes: readonly string[]; readonly redirectPath?: string }> {
  const config = requireConfig();
  const consumed = await consumeSocialOAuthState({
    actor,
    platform: "instagram",
    state: input.state,
  });
  const exchanged = await exchangeInstagramCode({ config, code: input.code });
  if (!exchanged?.accessToken) {
    throw new PersistenceError("forbidden", "Instagram authorization could not be completed.");
  }
  const account = await readInstagramAccount({ config, accessToken: exchanged.accessToken });
  if (!account) {
    throw new PersistenceError("forbidden", "Instagram account could not be verified.");
  }
  const scopes = exchanged.scopes.length > 0 ? exchanged.scopes : [...INSTAGRAM_SCOPES];
  await upsertSocialCredentialForActor(actor, "instagram", {
    tokens: {
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.accessToken,
      tokenType: "bearer",
    },
    scopes,
    externalAccountId: account.id,
    externalAccountName: account.username,
    accessTokenExpiresAt: exchanged.expiresAt,
  });
  return {
    username: account.username,
    accountId: account.id,
    scopes,
    redirectPath: consumed.redirectPath,
  };
}

export async function disconnectInstagramForActor(actor: Actor): Promise<void> {
  await revokeSocialCredentialForActor(actor, "instagram");
}
