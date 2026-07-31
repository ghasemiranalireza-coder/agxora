/**
 * API key management — generate, rotate, revoke, scopes, usage, expiration.
 */

import type { ApiKeyRecord } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function randomSecret(): string {
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(24)))
      : Array.from({ length: 24 }, () => Math.floor(Math.random() * 256));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createApiKey(input: {
  readonly organizationId: string;
  readonly name: string;
  readonly scopes: readonly string[];
  readonly expiresAt?: string;
}): ApiKeyRecord {
  const secret = `agx_live_${randomSecret()}`;
  const prefix = `${secret.slice(0, 12)}…`;
  return {
    id: createId("apk"),
    organizationId: input.organizationId,
    name: input.name,
    prefix,
    secretOnce: secret,
    scopes: input.scopes,
    status: "active",
    usageCount: 0,
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
  };
}

export function rotateApiKey(existing: ApiKeyRecord): ApiKeyRecord {
  const next = createApiKey({
    organizationId: existing.organizationId,
    name: existing.name,
    scopes: existing.scopes,
    expiresAt: existing.expiresAt,
  });
  return {
    ...next,
    rotatedFromId: existing.id,
  };
}

export function revokeApiKey(key: ApiKeyRecord): ApiKeyRecord {
  return { ...key, status: "revoked", secretOnce: undefined };
}

export function markApiKeyUsed(key: ApiKeyRecord): ApiKeyRecord {
  return {
    ...key,
    usageCount: key.usageCount + 1,
    lastUsedAt: new Date().toISOString(),
    secretOnce: undefined,
  };
}

export function isApiKeyExpired(key: ApiKeyRecord, now = Date.now()): boolean {
  if (!key.expiresAt) return false;
  return Date.parse(key.expiresAt) <= now;
}
