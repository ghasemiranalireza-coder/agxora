/**
 * Client-safe email provider id reader (no credentials).
 * Full provider resolution with tokens stays in server-only modules.
 */

export type EmailProviderIdName = "none" | "console" | "http" | "memory";

export function getEmailProviderId(): EmailProviderIdName {
  const value = (process.env.AGXORA_EMAIL_PROVIDER ?? "none")
    .trim()
    .toLowerCase();
  if (value === "console" || value === "http" || value === "memory") {
    return value;
  }
  return "none";
}

/**
 * Production transactional email is configured only when the HTTP worker
 * HTTPS URL and bearer token are both present. console/memory/none and
 * plaintext http:// worker URLs are not production delivery paths.
 */
export function isHttpEmailDeliveryConfigured(): boolean {
  const url = process.env.AGXORA_EMAIL_HTTP_URL?.trim() ?? "";
  return (
    getEmailProviderId() === "http" &&
    /^https:\/\//i.test(url) &&
    Boolean(process.env.AGXORA_EMAIL_HTTP_TOKEN?.trim())
  );
}

export function isTransactionalEmailConfigured(): boolean {
  return isHttpEmailDeliveryConfigured();
}
