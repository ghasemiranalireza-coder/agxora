/**
 * Phase 45 — delivery facade.
 *
 * delivery:
 * - "not_configured" when no provider is configured OR handoff failed
 * - "queued" only after the provider successfully accepts the message
 */

import "server-only";

import { getEmailProvider } from "./provider";
import type { EmailDeliveryStatus, EmailMessage } from "./types";

export type DeliverEmailResult = {
  readonly delivery: EmailDeliveryStatus;
  readonly error?: string;
};

export async function deliverEmail(
  message: EmailMessage,
): Promise<DeliverEmailResult> {
  const provider = getEmailProvider();
  if (!provider.configured) {
    return { delivery: "not_configured" };
  }

  const result = await provider.send(message);
  if (!result.ok) {
    // Never claim queued on failed handoff. Do not log raw tokens / actionUrl.
    console.error("[agxora.email] handoff failed", {
      provider: provider.id,
      kind: message.kind,
      to: message.to,
      error: result.error,
    });
    return { delivery: "not_configured", error: result.error };
  }

  return { delivery: "queued" };
}

export function isEmailDeliveryConfigured(): boolean {
  return getEmailProvider().configured;
}
