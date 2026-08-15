/**
 * Phase 45 — no-op provider (email delivery not configured).
 */

import "server-only";

import type { EmailMessage, EmailProvider, EmailSendResult } from "../types";

export const noneEmailProvider: EmailProvider = {
  id: "none",
  configured: false,
  async send(_message: EmailMessage): Promise<EmailSendResult> {
    return { ok: false, error: "Email provider is not configured" };
  },
};
