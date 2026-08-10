/**
 * Locale cookie helpers.
 *
 * Client: document.cookie / localStorage after mount.
 * Server: parse raw cookie header values only (no document/navigator).
 */

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  isAppLocale,
  normalizeToAppLocale,
  type AppLocale,
} from "./locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Validate an untrusted cookie/header value → AppLocale or null.
 * Rejects anything outside SUPPORTED_LOCALES (via normalizeToAppLocale).
 */
export function parseLocaleCookieValue(
  raw: string | null | undefined,
): AppLocale | null {
  if (!raw) return null;
  try {
    return normalizeToAppLocale(decodeURIComponent(raw.trim()));
  } catch {
    return normalizeToAppLocale(raw.trim());
  }
}

/** Deterministic SSR locale: valid cookie → that locale; else DEFAULT_LOCALE. */
export function resolveServerLocale(
  rawCookie: string | null | undefined,
): AppLocale {
  return parseLocaleCookieValue(rawCookie) ?? DEFAULT_LOCALE;
}

export function readLocaleCookie(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  if (!match?.[1]) return null;
  return parseLocaleCookieValue(match[1]);
}

export function writeLocaleCookie(locale: AppLocale): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export function readLocaleStorage(): AppLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return normalizeToAppLocale(raw);
  } catch {
    return null;
  }
}

export function writeLocaleStorage(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore quota / private mode
  }
}

export function detectBrowserLocale(): AppLocale | null {
  if (typeof navigator === "undefined") return null;
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);
  for (const tag of candidates) {
    const hit = normalizeToAppLocale(tag);
    if (hit) return hit;
  }
  return null;
}

export function resolveClientLocale(options?: {
  readonly userPreference?: string | null;
  readonly workspaceLanguage?: string | null;
}): AppLocale {
  const fromUser = normalizeToAppLocale(options?.userPreference);
  if (fromUser) return fromUser;

  const fromCookie = readLocaleCookie();
  if (fromCookie) return fromCookie;

  const fromStorage = readLocaleStorage();
  if (fromStorage) return fromStorage;

  const fromWorkspace = normalizeToAppLocale(options?.workspaceLanguage);
  if (fromWorkspace) return fromWorkspace;

  const fromBrowser = detectBrowserLocale();
  if (fromBrowser) return fromBrowser;

  return isAppLocale(DEFAULT_LOCALE) ? DEFAULT_LOCALE : "en";
}
