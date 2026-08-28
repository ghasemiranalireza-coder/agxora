/**
 * Phase 63.1 — YouTube OAuth connect / callback / disconnect helpers.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getYouTubeOAuthConfig, isYouTubePublishEnabled } from "../config";
import {
  createPkcePair,
  upsertSocialCredentialForActor,
  revokeSocialCredentialForActor,
} from "../credentials";
import { issueSocialOAuthState, consumeSocialOAuthState } from "./state";
import { patchSocialAccountConnectionForActor } from "@/app/lib/creative/persistPublishResult";

export type YouTubeConnectResult = {
  readonly authorizationUrl: string;
};

export type YouTubeCallbackResult = {
  readonly connected: true;
  readonly displayName?: string;
  readonly redirectPath?: string;
};

function requireYouTubeEnabled(): void {
  if (!isYouTubePublishEnabled()) {
    throw new PersistenceError("misconfigured", "YouTube publish is disabled", {
      details: [{ field: "youtube", message: "publish_disabled" }],
    });
  }
  if (!getYouTubeOAuthConfig()) {
    throw new PersistenceError("misconfigured", "YouTube OAuth is not configured", {
      details: [{ field: "youtube", message: "oauth_not_configured" }],
    });
  }
}

export async function beginYouTubeOAuthForActor(
  actor: Actor,
  redirectPath?: string,
): Promise<YouTubeConnectResult> {
  requireYouTubeEnabled();
  const config = getYouTubeOAuthConfig()!;
  const pkce = createPkcePair();
  const issued = await issueSocialOAuthState({
    actor,
    platform: "youtube",
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
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  });

  return {
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

export async function completeYouTubeOAuthForActor(
  actor: Actor,
  input: { readonly code: string; readonly state: string },
): Promise<YouTubeCallbackResult> {
  requireYouTubeEnabled();
  const config = getYouTubeOAuthConfig()!;
  const consumed = await consumeSocialOAuthState({
    actor,
    platform: "youtube",
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

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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

  let channelName: string | undefined;
  let channelId: string | undefined;
  try {
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    if (channelResponse.ok) {
      const payload = (await channelResponse.json()) as {
        items?: Array<{ id?: string; snippet?: { title?: string } }>;
      };
      channelId = payload.items?.[0]?.id;
      channelName = payload.items?.[0]?.snippet?.title;
    }
  } catch {
    // Channel metadata is optional.
  }

  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

  await upsertSocialCredentialForActor(actor, "youtube", {
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
    },
    scopes: [...config.scopes],
    externalAccountId: channelId,
    externalAccountName: channelName,
    accessTokenExpiresAt: expiresAt,
  });

  await patchSocialAccountConnectionForActor(actor, {
    platform: "youtube",
    connected: true,
    displayName: channelName,
    handle: channelId,
  });

  return {
    connected: true,
    displayName: channelName,
    redirectPath: consumed.redirectPath,
  };
}

export async function disconnectYouTubeForActor(actor: Actor): Promise<void> {
  await revokeSocialCredentialForActor(actor, "youtube");
  await patchSocialAccountConnectionForActor(actor, {
    platform: "youtube",
    connected: false,
  });
}
