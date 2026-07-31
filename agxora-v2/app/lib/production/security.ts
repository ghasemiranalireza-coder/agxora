/**
 * Security helpers — session validation, token placeholders, data boundaries.
 */

export interface SessionValidationResult {
  readonly valid: boolean;
  readonly reason?:
    | "missing"
    | "empty"
    | "malformed"
    | "expired_placeholder"
    | "ok";
}

/** Soft cookie session validation — replace with JWT/httpOnly server checks. */
export function validateSessionToken(
  token: string | null | undefined,
): SessionValidationResult {
  if (token == null) return { valid: false, reason: "missing" };
  if (!token.trim()) return { valid: false, reason: "empty" };
  if (token.length < 8) return { valid: false, reason: "malformed" };
  // Placeholder for exp claim parsing when remote auth is wired.
  if (token.startsWith("expired_")) {
    return { valid: false, reason: "expired_placeholder" };
  }
  return { valid: true, reason: "ok" };
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
