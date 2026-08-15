/**
 * Phase 45 — server-only email delivery types.
 */

export type EmailDeliveryStatus = "not_configured" | "queued";

export type EmailKind =
  | "invitation"
  | "password_reset"
  | "email_verification"
  | "ownership_transfer";

export type EmailMessage = {
  readonly kind: EmailKind;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  /** Absolute URL including one-time token — never log this value. */
  readonly actionUrl: string;
};

export type EmailSendResult =
  | { readonly ok: true; readonly providerMessageId?: string }
  | { readonly ok: false; readonly error: string };

export type EmailProviderId = "none" | "console" | "http" | "memory";

export type EmailProvider = {
  readonly id: EmailProviderId;
  /** True when this provider can attempt a real handoff. */
  readonly configured: boolean;
  send(message: EmailMessage): Promise<EmailSendResult>;
};
