/**
 * Phase 63.1 — AES-256-GCM credential encryption (server-only).
 */

import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { requireSocialOAuthEncryptionKey } from "./config";

const VERSION_PREFIX = "v1";

export function encryptSocialSecret(plaintext: string): string {
  const key = requireSocialOAuthEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSocialSecret(ciphertext: string): string {
  const key = requireSocialOAuthEncryptionKey();
  const [version, ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (version !== VERSION_PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("invalid_ciphertext");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
