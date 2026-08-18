/**
 * Phase 45 — no-op provider (email delivery not configured).
 */

import "server-only";

import type { EmailProvider, EmailSendResult } from "../types";

export const noneEmailProvider: EmailProvider = {
  id: "none",
  configured: false,
  async send(): Promise<EmailSendResult> {
    return { ok: false, error: "Email provider is not configured" };
  },
};
