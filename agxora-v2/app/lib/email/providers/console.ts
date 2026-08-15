/**
 * Phase 45 — console provider for local/dev handoff verification.
 * Never prints action URLs or raw tokens.
 */

import "server-only";

import { redactActionUrl } from "../templates";
import type { EmailMessage, EmailProvider, EmailSendResult } from "../types";

export const consoleEmailProvider: EmailProvider = {
  id: "console",
  configured: true,
  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Structured log without secrets / raw tokens.
    console.info("[agxora.email]", {
      provider: "console",
      kind: message.kind,
      to: message.to,
      subject: message.subject,
      actionUrl: redactActionUrl(message.actionUrl, message.kind),
    });
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  },
};
