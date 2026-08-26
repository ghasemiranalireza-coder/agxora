/**
 * Phase 45 — server-only email configuration.
 *
 * Provider credentials never use NEXT_PUBLIC_*.
 * Legacy AGXORA_AUTH_EMAIL_DELIVERY=configured alone does NOT enable delivery
 * (that flag previously claimed "queued" without a handoff).
 */

import "server-only";

import type { EmailProviderId } from "./types";
import { getEmailProviderId } from "./providerId";

export type EmailConfig = {
  readonly provider: EmailProviderId;
  readonly from: string;
  readonly httpUrl: string | null;
  readonly httpToken: string | null;
};

export function getEmailConfig(): EmailConfig {
  const provider = getEmailProviderId() as EmailProviderId;
  const from =
    process.env.AGXORA_EMAIL_FROM?.trim() ||
    process.env.NEXT_PUBLIC_AGXORA_EMAIL_SUPPORT?.trim() ||
    "noreply@agxora.app";
  const httpUrl = process.env.AGXORA_EMAIL_HTTP_URL?.trim() || null;
  const httpToken = process.env.AGXORA_EMAIL_HTTP_TOKEN?.trim() || null;
  return { provider, from, httpUrl, httpToken };
}

export function getAppOrigin(): string {
  const site =
    process.env.NEXT_PUBLIC_AGXORA_SITE_URL?.trim() ||
    process.env.AGXORA_APP_ORIGIN?.trim() ||
    "http://localhost:3000";
  return site.replace(/\/$/, "");
}
