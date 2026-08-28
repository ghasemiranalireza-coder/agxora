/**
 * Phase 63.1 — OAuth state persistence (hashed, single-use, PKCE-aware).
 */

import "server-only";

import { randomUUID } from "crypto";
import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { createOpaqueToken, hashOpaqueToken, timingSafeEqualHex } from "@/app/lib/auth/server/tokens";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { OAUTH_STATE_TTL_MS } from "../config";
import { hashPkceVerifier } from "../credentials";
import { decryptSocialSecret, encryptSocialSecret } from "../crypto";

export type OAuthStateIssue = {
  readonly state: string;
  readonly codeVerifier: string;
};

export type OAuthStateConsumeResult = {
  readonly organizationId: string;
  readonly userId: string;
  readonly platform: SocialPlatform;
  readonly codeVerifier: string;
  readonly redirectPath?: string;
};

type OAuthStateStore = {
  issue(input: {
    actor: Actor;
    platform: SocialPlatform;
    codeVerifier: string;
    redirectPath?: string;
  }): Promise<OAuthStateIssue>;
  consume(input: {
    actor: Actor;
    platform: SocialPlatform;
    state: string;
  }): Promise<OAuthStateConsumeResult>;
};

const memoryStates = new Map<
  string,
  {
    organizationId: string;
    userId: string;
    platform: SocialPlatform;
    codeVerifierHash: string;
    encryptedCodeVerifier: string;
    redirectPath?: string;
    consumedAt?: Date;
    expiresAt: Date;
  }
>();

const databaseOAuthStateStore: OAuthStateStore = {
  async issue({ actor, platform, codeVerifier, redirectPath }) {
    const state = createOpaqueToken(32);
    const stateHash = hashOpaqueToken(state);
    const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
    await prisma.socialOAuthState.create({
      data: {
        id: randomUUID(),
        organizationId: actor.organizationId,
        userId: actor.userId,
        platform,
        stateHash,
        codeVerifierHash: hashPkceVerifier(codeVerifier),
        encryptedCodeVerifier: encryptSocialSecret(codeVerifier),
        redirectPath: redirectPath ?? null,
        expiresAt,
      },
    });
    return { state, codeVerifier };
  },

  async consume({ actor, platform, state }) {
    const stateHash = hashOpaqueToken(state);
    const row = await prisma.socialOAuthState.findUnique({ where: { stateHash } });
    if (!row) {
      throw new PersistenceError("forbidden", "Invalid OAuth state", {
        details: [{ field: "state", message: "not_found" }],
      });
    }
    if (row.consumedAt) {
      throw new PersistenceError("forbidden", "OAuth state already consumed", {
        details: [{ field: "state", message: "consumed" }],
      });
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new PersistenceError("forbidden", "OAuth state expired", {
        details: [{ field: "state", message: "expired" }],
      });
    }
    if (row.organizationId !== actor.organizationId || row.userId !== actor.userId) {
      throw new PersistenceError("forbidden", "OAuth state organization mismatch", {
        details: [{ field: "state", message: "cross_org" }],
      });
    }
    if (row.platform !== platform) {
      throw new PersistenceError("forbidden", "OAuth state platform mismatch", {
        details: [{ field: "state", message: "platform_mismatch" }],
      });
    }
    if (!timingSafeEqualHex(stateHash, row.stateHash)) {
      throw new PersistenceError("forbidden", "Invalid OAuth state", {
        details: [{ field: "state", message: "hash_mismatch" }],
      });
    }
    await prisma.socialOAuthState.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return {
      organizationId: row.organizationId,
      userId: row.userId,
      platform: row.platform,
      codeVerifier: decryptSocialSecret(row.encryptedCodeVerifier),
      redirectPath: row.redirectPath ?? undefined,
    };
  },
};

const memoryOAuthStateStore: OAuthStateStore = {
  async issue({ actor, platform, codeVerifier, redirectPath }) {
    const state = createOpaqueToken(32);
    const stateHash = hashOpaqueToken(state);
    memoryStates.set(stateHash, {
      organizationId: actor.organizationId,
      userId: actor.userId,
      platform,
      codeVerifierHash: hashPkceVerifier(codeVerifier),
      encryptedCodeVerifier: encryptSocialSecret(codeVerifier),
      redirectPath,
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    });
    return { state, codeVerifier };
  },
  async consume({ actor, platform, state }) {
    const stateHash = hashOpaqueToken(state);
    const row = memoryStates.get(stateHash);
    if (!row) {
      throw new PersistenceError("forbidden", "Invalid OAuth state");
    }
    if (row.consumedAt) {
      throw new PersistenceError("forbidden", "OAuth state already consumed");
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new PersistenceError("forbidden", "OAuth state expired");
    }
    if (row.organizationId !== actor.organizationId || row.userId !== actor.userId) {
      throw new PersistenceError("forbidden", "OAuth state organization mismatch");
    }
    if (row.platform !== platform) {
      throw new PersistenceError("forbidden", "OAuth state platform mismatch");
    }
    memoryStates.set(stateHash, { ...row, consumedAt: new Date() });
    return {
      organizationId: row.organizationId,
      userId: row.userId,
      platform: row.platform,
      codeVerifier: decryptSocialSecret(row.encryptedCodeVerifier),
      redirectPath: row.redirectPath,
    };
  },
};

let storeOverride: OAuthStateStore | null = null;

function resolveStore(): OAuthStateStore {
  if (storeOverride) return storeOverride;
  if (process.env.NODE_ENV === "test") return memoryOAuthStateStore;
  return databaseOAuthStateStore;
}

export function setSocialOAuthStateStoreForTests(store: OAuthStateStore | null): void {
  storeOverride = store;
  if (store === null) memoryStates.clear();
}

export async function issueSocialOAuthState(input: {
  readonly actor: Actor;
  readonly platform: SocialPlatform;
  readonly codeVerifier: string;
  readonly redirectPath?: string;
}): Promise<OAuthStateIssue> {
  return resolveStore().issue(input);
}

export async function consumeSocialOAuthState(input: {
  readonly actor: Actor;
  readonly platform: SocialPlatform;
  readonly state: string;
}): Promise<OAuthStateConsumeResult> {
  return resolveStore().consume(input);
}

export function verifyPkceVerifier(
  codeVerifier: string,
  codeVerifierHash: string,
): boolean {
  return timingSafeEqualHex(hashPkceVerifier(codeVerifier), codeVerifierHash);
}
