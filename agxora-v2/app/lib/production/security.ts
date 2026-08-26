/**
 * Security helpers — session validation, token placeholders, data boundaries.
 */

export interface SessionCookieDescription {
  readonly present: boolean;
}

/**
 * Edge-safe cookie presence check only.
 * Never treat an arbitrary string as a valid session — Node layouts hash the
 * token and look it up in PostgreSQL.
 */
export function describeSessionCookie(
  token: string | null | undefined,
): SessionCookieDescription {
  return { present: Boolean(token?.trim()) };
}

/** @deprecated Use describeSessionCookie; presence is not authentication. */
export function validateSessionToken(
  token: string | null | undefined,
): { readonly valid: false; readonly reason: "unchecked" | "missing" } {
  if (token == null || !token.trim()) {
    return { valid: false, reason: "missing" };
  }
  return { valid: false, reason: "unchecked" };
}

/** Sensitive field redaction for logs / analytics payloads. */
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "authorization",
  "creditCard",
  "ssn",
]);

export function redactSensitive(
  input: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key) || /secret|password|token|key/i.test(key)) {
      out[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** API authorization placeholder — future bearer / workspace scope checks. */
export function authorizeApiRequestPlaceholder(input: {
  readonly hasSession: boolean;
  readonly requiredScope?: string;
  readonly grantedScopes?: readonly string[];
}): { readonly allowed: boolean; readonly code?: string } {
  if (!input.hasSession) return { allowed: false, code: "UNAUTHENTICATED" };
  if (
    input.requiredScope &&
    input.grantedScopes &&
    !input.grantedScopes.includes(input.requiredScope)
  ) {
    return { allowed: false, code: "FORBIDDEN" };
  }
  return { allowed: true };
}
