/**
 * Session cookie / storage helpers — never store passwords here.
 */

export const AUTH_SESSION_COOKIE = "agxora.session";
export const AUTH_STORAGE_KEY = "agxora.auth.v1";

export interface PersistedAuthStore {
  readonly version: 1;
  readonly users: readonly PersistedAuthUser[];
  readonly sessions: readonly PersistedAuthSession[];
  readonly resetTokens: readonly PersistedToken[];
  readonly verifyTokens: readonly PersistedToken[];
  readonly activeSessionId: string | null;
}

export interface PersistedAuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly emailVerified: boolean;
  readonly passwordHash: string;
  readonly defaultOrganizationId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PersistedAuthSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface PersistedToken {
  readonly token: string;
  readonly userId: string;
  readonly expiresAt: string;
}

export function createEmptyAuthStore(): PersistedAuthStore {
  return {
    version: 1,
    users: [],
    sessions: [],
    resetTokens: [],
    verifyTokens: [],
    activeSessionId: null,
  };
}

export function readAuthStore(): PersistedAuthStore {
  if (typeof window === "undefined") return createEmptyAuthStore();
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return createEmptyAuthStore();
    const parsed = JSON.parse(raw) as PersistedAuthStore;
    return {
      ...createEmptyAuthStore(),
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      resetTokens: Array.isArray(parsed.resetTokens) ? parsed.resetTokens : [],
      verifyTokens: Array.isArray(parsed.verifyTokens) ? parsed.verifyTokens : [],
    };
  } catch {
    return createEmptyAuthStore();
  }
}

export function writeAuthStore(store: PersistedAuthStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota / private mode.
  }
}

export function setSessionCookie(sessionId: string | null): void {
  if (typeof document === "undefined") return;
  if (!sessionId) {
    document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  // 30 days — production adapters should use httpOnly cookies from the server.
  document.cookie = `${AUTH_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function readSessionCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_SESSION_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(AUTH_SESSION_COOKIE.length + 1));
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`agxora:${password}`);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for non-subtle environments — replaced by real auth adapters.
  let hash = 0;
  for (let i = 0; i < password.length; i += 1) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${hash.toString(16)}`;
}

export function createToken(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
