/**
 * Phase 63.1 — org-scoped social credential storage (Prisma + encryption).
 */

import "server-only";

import { createHash, randomBytes } from "crypto";
import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { hashOpaqueToken } from "@/app/lib/auth/server/tokens";
import { decryptSocialSecret, encryptSocialSecret } from "./crypto";
import { getYouTubeOAuthConfig } from "./config";

export type StoredSocialTokens = {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly tokenType?: string;
};

export type SocialCredentialSummary = {
  readonly platform: SocialPlatform;
  readonly externalAccountId?: string;
  readonly externalAccountName?: string;
  readonly accessTokenExpiresAt?: Date;
  readonly revokedAt?: Date;
};

type CredentialStore = {
  hasActiveCredential(organizationId: string, platform: SocialPlatform): Promise<boolean>;
  getCredentialSummary(
    organizationId: string,
    platform: SocialPlatform,
  ): Promise<SocialCredentialSummary | null>;
  upsertCredentialForActor(
    actor: Actor,
    platform: SocialPlatform,
    input: {
      readonly tokens: StoredSocialTokens;
      readonly scopes: readonly string[];
      readonly externalAccountId?: string;
      readonly externalAccountName?: string;
      readonly accessTokenExpiresAt?: Date;
    },
  ): Promise<SocialCredentialSummary>;
  revokeCredentialForActor(actor: Actor, platform: SocialPlatform): Promise<void>;
  getValidAccessTokenForActor(
    actor: Actor,
    platform: SocialPlatform,
  ): Promise<string | null>;
};

function encryptTokens(tokens: StoredSocialTokens): string {
  return encryptSocialSecret(JSON.stringify(tokens));
}

function decryptTokens(payload: string): StoredSocialTokens {
  const parsed = JSON.parse(decryptSocialSecret(payload)) as StoredSocialTokens;
  if (!parsed?.accessToken) {
    throw new Error("invalid_token_payload");
  }
  return parsed;
}

function isActiveCredential(row: {
  revokedAt: Date | null;
  encryptedPayload: string;
}): boolean {
  return row.revokedAt == null && row.encryptedPayload.length > 0;
}

async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt?: Date }> {
  const config = getYouTubeOAuthConfig();
  if (!config) {
    throw new PersistenceError("misconfigured", "YouTube OAuth is not configured");
  }
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
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

const databaseCredentialStore: CredentialStore = {
  async hasActiveCredential(organizationId, platform) {
    const row = await prisma.socialPlatformCredential.findUnique({
      where: { organizationId_platform: { organizationId, platform } },
    });
    return Boolean(row && isActiveCredential(row));
  },

  async getCredentialSummary(organizationId, platform) {
    const row = await prisma.socialPlatformCredential.findUnique({
      where: { organizationId_platform: { organizationId, platform } },
    });
    if (!row || !isActiveCredential(row)) return null;
    return {
      platform: row.platform,
      externalAccountId: row.externalAccountId ?? undefined,
      externalAccountName: row.externalAccountName ?? undefined,
      accessTokenExpiresAt: row.accessTokenExpiresAt ?? undefined,
      revokedAt: row.revokedAt ?? undefined,
    };
  },

  async upsertCredentialForActor(actor, platform, input) {
    const encryptedPayload = encryptTokens(input.tokens);
    const row = await prisma.socialPlatformCredential.upsert({
      where: {
        organizationId_platform: {
          organizationId: actor.organizationId,
          platform,
        },
      },
      create: {
        organizationId: actor.organizationId,
        platform,
        encryptedPayload,
        scopes: [...input.scopes],
        externalAccountId: input.externalAccountId ?? null,
        externalAccountName: input.externalAccountName ?? null,
        accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
        revokedAt: null,
      },
      update: {
        encryptedPayload,
        scopes: [...input.scopes],
        externalAccountId: input.externalAccountId ?? null,
        externalAccountName: input.externalAccountName ?? null,
        accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
        revokedAt: null,
      },
    });
    return {
      platform: row.platform,
      externalAccountId: row.externalAccountId ?? undefined,
      externalAccountName: row.externalAccountName ?? undefined,
      accessTokenExpiresAt: row.accessTokenExpiresAt ?? undefined,
    };
  },

  async revokeCredentialForActor(actor, platform) {
    await prisma.socialPlatformCredential.updateMany({
      where: {
        organizationId: actor.organizationId,
        platform,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        encryptedPayload: "",
        accessTokenExpiresAt: null,
      },
    });
  },

  async getValidAccessTokenForActor(actor, platform) {
    const row = await prisma.socialPlatformCredential.findUnique({
      where: {
        organizationId_platform: {
          organizationId: actor.organizationId,
          platform,
        },
      },
    });
    if (!row || !isActiveCredential(row)) return null;

    let tokens: StoredSocialTokens;
    try {
      tokens = decryptTokens(row.encryptedPayload);
    } catch {
      return null;
    }

    const expiresAt = row.accessTokenExpiresAt?.getTime() ?? 0;
    const needsRefresh = expiresAt > 0 && expiresAt <= Date.now() + 60_000;
    if (!needsRefresh) {
      return tokens.accessToken;
    }
    if (!tokens.refreshToken) {
      return null;
    }

    try {
      const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
      const nextTokens: StoredSocialTokens = {
        ...tokens,
        accessToken: refreshed.accessToken,
      };
      await prisma.socialPlatformCredential.update({
        where: { id: row.id },
        data: {
          encryptedPayload: encryptTokens(nextTokens),
          accessTokenExpiresAt: refreshed.expiresAt ?? null,
        },
      });
      return refreshed.accessToken;
    } catch {
      return null;
    }
  },
};

const memoryCredentials = new Map<string, {
  summary: SocialCredentialSummary;
  tokens: StoredSocialTokens;
}>();

function memoryKey(organizationId: string, platform: SocialPlatform): string {
  return `${organizationId}::${platform}`;
}

const memoryCredentialStore: CredentialStore = {
  async hasActiveCredential(organizationId, platform) {
    const item = memoryCredentials.get(memoryKey(organizationId, platform));
    return Boolean(item && !item.summary.revokedAt);
  },
  async getCredentialSummary(organizationId, platform) {
    const item = memoryCredentials.get(memoryKey(organizationId, platform));
    if (!item || item.summary.revokedAt) return null;
    return item.summary;
  },
  async upsertCredentialForActor(actor, platform, input) {
    const summary: SocialCredentialSummary = {
      platform,
      externalAccountId: input.externalAccountId,
      externalAccountName: input.externalAccountName,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
    };
    memoryCredentials.set(memoryKey(actor.organizationId, platform), {
      summary,
      tokens: input.tokens,
    });
    return summary;
  },
  async revokeCredentialForActor(actor, platform) {
    const key = memoryKey(actor.organizationId, platform);
    const item = memoryCredentials.get(key);
    if (!item) return;
    memoryCredentials.set(key, {
      ...item,
      summary: { ...item.summary, revokedAt: new Date() },
      tokens: { accessToken: "" },
    });
  },
  async getValidAccessTokenForActor(actor, platform) {
    const item = memoryCredentials.get(memoryKey(actor.organizationId, platform));
    if (!item || item.summary.revokedAt) return null;
    const expiresAt = item.summary.accessTokenExpiresAt?.getTime() ?? 0;
    const needsRefresh = expiresAt > 0 && expiresAt <= Date.now() + 60_000;
    if (!needsRefresh) {
      return item.tokens.accessToken || null;
    }
    if (!item.tokens.refreshToken) return null;
    try {
      const refreshed = await refreshGoogleAccessToken(item.tokens.refreshToken);
      const nextTokens = { ...item.tokens, accessToken: refreshed.accessToken };
      memoryCredentials.set(memoryKey(actor.organizationId, platform), {
        summary: {
          ...item.summary,
          accessTokenExpiresAt: refreshed.expiresAt,
        },
        tokens: nextTokens,
      });
      return refreshed.accessToken;
    } catch {
      return null;
    }
  },
};

let storeOverride: CredentialStore | null = null;

function resolveStore(): CredentialStore {
  if (storeOverride) return storeOverride;
  if (process.env.NODE_ENV === "test") return memoryCredentialStore;
  return databaseCredentialStore;
}

export function setSocialCredentialStoreForTests(store: CredentialStore | null): void {
  storeOverride = store;
  if (store === null) memoryCredentials.clear();
}

export function socialPlatformFromSocialId(platformId: string): SocialPlatform | null {
  if (platformId === "youtube") return "youtube";
  return null;
}

export async function hasActiveSocialCredential(
  organizationId: string,
  platformId: string,
): Promise<boolean> {
  const platform = socialPlatformFromSocialId(platformId);
  if (!platform) return false;
  return resolveStore().hasActiveCredential(organizationId, platform);
}

export async function upsertSocialCredentialForActor(
  actor: Actor,
  platformId: string,
  input: {
    readonly tokens: StoredSocialTokens;
    readonly scopes: readonly string[];
    readonly externalAccountId?: string;
    readonly externalAccountName?: string;
    readonly accessTokenExpiresAt?: Date;
  },
): Promise<SocialCredentialSummary> {
  const platform = socialPlatformFromSocialId(platformId);
  if (!platform) {
    throw new PersistenceError("validation", "Unsupported social platform");
  }
  return resolveStore().upsertCredentialForActor(actor, platform, input);
}

export async function revokeSocialCredentialForActor(
  actor: Actor,
  platformId: string,
): Promise<void> {
  const platform = socialPlatformFromSocialId(platformId);
  if (!platform) {
    throw new PersistenceError("validation", "Unsupported social platform");
  }
  await resolveStore().revokeCredentialForActor(actor, platform);
}

export async function getValidSocialAccessTokenForActor(
  actor: Actor,
  platformId: string,
): Promise<string | null> {
  const platform = socialPlatformFromSocialId(platformId);
  if (!platform) return null;
  return resolveStore().getValidAccessTokenForActor(actor, platform);
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function hashPkceVerifier(verifier: string): string {
  return hashOpaqueToken(verifier);
}
