/**
 * Phase 45 — in-memory provider for vitest (never used in production builds).
 */

import "server-only";

import type { EmailMessage, EmailProvider, EmailSendResult } from "../types";

const outbox: EmailMessage[] = [];
let failNext = false;
let failMessage = "Forced memory provider failure";

export function resetMemoryEmailOutbox(): void {
  outbox.length = 0;
  failNext = false;
  failMessage = "Forced memory provider failure";
}

export function listMemoryEmailOutbox(): readonly EmailMessage[] {
  return [...outbox];
}

export function forceMemoryEmailFailure(message = "Forced memory provider failure"): void {
  failNext = true;
  failMessage = message;
}

export const memoryEmailProvider: EmailProvider = {
  id: "memory",
  configured: true,
  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (failNext) {
      failNext = false;
      return { ok: false, error: failMessage };
    }
    outbox.push(message);
    return { ok: true, providerMessageId: `memory-${outbox.length}` };
  },
};
