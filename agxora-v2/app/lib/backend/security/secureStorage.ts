/**
 * Secure storage abstraction — JWT / refresh tokens / future encryption.
 * Never store secrets in plain UI state.
 */

import { getPlatformConfig } from "../config/featureFlags";
import { logPlatformEvent } from "../observability/logger";

export interface TokenBundle {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt?: string;
}

export interface SecureStorageAdapter {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
}

/** Browser LocalStorage adapter — replaced by httpOnly cookies / WebCrypto later. */
export const localSecureStorage: SecureStorageAdapter = {
  async getItem(key) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  async removeItem(key) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

let adapter: SecureStorageAdapter = localSecureStorage;

export function setSecureStorageAdapter(next: SecureStorageAdapter): void {
  adapter = next;
}

export async function readTokenBundle(): Promise<TokenBundle | null> {
  const raw = await adapter.getItem(getPlatformConfig().jwtStorageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenBundle;
  } catch {
    return null;
  }
}

export async function writeTokenBundle(bundle: TokenBundle): Promise<void> {
  await adapter.setItem(
    getPlatformConfig().jwtStorageKey,
    JSON.stringify(bundle),
  );
  logPlatformEvent("auth.token_refresh", { source: "secure_storage_write" });
}

export async function clearTokenBundle(): Promise<void> {
  await adapter.removeItem(getPlatformConfig().jwtStorageKey);
}

/** CSRF token placeholder — set when backend issues one. */
let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/** Future encryption hook — identity transform until WebCrypto is wired. */
export async function encryptPayload(plaintext: string): Promise<string> {
  return plaintext;
}

export async function decryptPayload(ciphertext: string): Promise<string> {
  return ciphertext;
}
