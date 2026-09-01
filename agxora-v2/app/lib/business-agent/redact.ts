/**
 * Phase 70 — strip secrets from JSON persisted in audit/run/campaign records.
 */

const SECRET_KEY = /(token|secret|password|authorization|apikey|api_key|cookie|credential|private)/i;

export function redactSecrets<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, nested]) => {
        if (SECRET_KEY.test(key)) {
          return [key, "[redacted]"] as const;
        }
        return [key, redactValue(nested)] as const;
      },
    );
    return Object.fromEntries(entries);
  }
  if (typeof value === "string" && /^(sk-|ya29\.|xox|ghp_|Bearer )/i.test(value)) {
    return "[redacted]";
  }
  return value;
}
