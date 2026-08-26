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

export function isTransactionalEmailConfigured(): boolean {
  return getEmailProviderId() !== "none";
}
