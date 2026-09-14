/**
 * Same-origin relative path allowlist for post-OAuth redirects.
 * Never trust client redirectPath just because it was stored in OAuth state.
 */

const INTERNAL_ORIGIN = "https://agxora.internal";
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export const DEFAULT_SAFE_INTERNAL_PATH = "/dashboard/integrations";
export const GMAIL_OAUTH_FALLBACK_PATH = "/dashboard/integrations";
export const YOUTUBE_OAUTH_FALLBACK_PATH = "/agents?tab=social";

function isSafeRelativeAppPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (CONTROL_CHARS.test(trimmed)) return null;
  if (trimmed.includes("\\") || /%5c/i.test(trimmed)) return null;
  if (/%00/i.test(trimmed)) return null;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  if (CONTROL_CHARS.test(decoded) || decoded.includes("\\")) return null;
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) return null;
  if (decoded.toLowerCase().includes("javascript:")) return null;

  try {
    const parsed = new URL(decoded, INTERNAL_ORIGIN);
    if (parsed.protocol !== "https:") return null;
    if (parsed.origin !== INTERNAL_ORIGIN) return null;
    if (parsed.hostname !== "agxora.internal") return null;
    if (parsed.username || parsed.password) return null;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) return null;
    if (path.includes("\\") || path.includes("://")) return null;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return null;
    return path;
  } catch {
    return null;
  }
}

export function resolveSafeInternalPath(
  input: unknown,
  fallback: string = DEFAULT_SAFE_INTERNAL_PATH,
): string {
  const safeFallback =
    isSafeRelativeAppPath(fallback) ?? DEFAULT_SAFE_INTERNAL_PATH;
  if (typeof input !== "string") return safeFallback;
  return isSafeRelativeAppPath(input) ?? safeFallback;
}

export function buildSafeSameOriginRedirectUrl(
  requestUrl: string,
  redirectPath: unknown,
  fallback: string = DEFAULT_SAFE_INTERNAL_PATH,
): URL {
  const origin = new URL(requestUrl).origin;
  const path = resolveSafeInternalPath(redirectPath, fallback);
  return new URL(path, origin);
}
