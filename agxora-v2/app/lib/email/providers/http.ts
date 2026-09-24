/**
 * Phase 45 — HTTP webhook provider (fetch-based, no extra dependencies).
 *
 * POSTs JSON to AGXORA_EMAIL_HTTP_URL with required bearer AGXORA_EMAIL_HTTP_TOKEN.
 * The downstream worker owns SMTP/ESP integration.
 */

import "server-only";

import type { EmailConfig } from "../config";
import type { EmailMessage, EmailProvider, EmailSendResult } from "../types";

export function createHttpEmailProvider(config: EmailConfig): EmailProvider {
  const url = config.httpUrl;
  const token = config.httpToken;
  const configured = Boolean(url && token);

  return {
    id: "http",
    configured,
    async send(message: EmailMessage): Promise<EmailSendResult> {
      if (!url) {
        return { ok: false, error: "AGXORA_EMAIL_HTTP_URL is not set" };
      }
      if (!token) {
        return { ok: false, error: "AGXORA_EMAIL_HTTP_TOKEN is not set" };
      }

      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${token}`,
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            from: config.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            kind: message.kind,
            actionUrl: message.actionUrl,
            ...(message.idempotencyKey
              ? { idempotencyKey: message.idempotencyKey }
              : {}),
          }),
        });

        if (!response.ok) {
          return {
            ok: false,
            error: `HTTP provider rejected message (${response.status})`,
          };
        }

        let providerMessageId: string | undefined;
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json().catch(() => null)) as {
            id?: string;
            messageId?: string;
          } | null;
          providerMessageId = payload?.id ?? payload?.messageId;
        }

        return { ok: true, providerMessageId };
      } catch {
        return { ok: false, error: "HTTP provider handoff failed" };
      }
    },
  };
}
