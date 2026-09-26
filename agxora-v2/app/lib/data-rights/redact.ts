/**
 * Phase 20 — drop credential and message-body fields from export and evidence.
 * Business content such as note text the organization already stores is kept
 * when it is not under a blocked key.
 */

const BLOCKED_KEY =
  /^(password|passwordhash|token|accesstoken|refreshtoken|secret|apikey|authorization|cookie|credential|credentials|clientsecret|encryptionkey|html|cvc|cvv|pan|cardnumber|cardpan|webhooksecret|stripesecret|stripewebhooksecret|paymentmethod|paymentcredentials)$/i;

export function isBlockedExportKey(key: string): boolean {
  return BLOCKED_KEY.test(key.replace(/[_-]/g, ""));
}

export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > 8) return null;
  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (isBlockedExportKey(key)) continue;
      output[key] = redactSecrets(item, depth + 1);
    }
    return output;
  }
  return null;
}
