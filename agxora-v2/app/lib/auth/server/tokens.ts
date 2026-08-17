/**
 * High-entropy opaque tokens + SHA-256 hashing for secrets at rest.
 * Session cookies carry the raw opaque token; PostgreSQL stores tokenHash only.
 */

import "server-only";

import { createHash, randomBytes } from "crypto";

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Hash a raw session cookie token for PostgreSQL lookup / storage. */
export function hashSessionToken(rawToken: string): string {
  return hashOpaqueToken(rawToken);
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}
