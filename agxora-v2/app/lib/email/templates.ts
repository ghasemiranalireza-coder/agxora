/**
 * Phase 45 — plain-text email templates.
 * Action URLs contain one-time tokens; callers must not log them.
 */

import type { EmailKind, EmailMessage } from "./types";
import { getAppOrigin } from "./config";

export function buildInvitationEmail(input: {
  readonly to: string;
  readonly organizationName: string;
  readonly workspaceName: string;
  readonly role: string;
  readonly rawToken: string;
  readonly inviterName?: string;
}): EmailMessage {
  const actionUrl = `${getAppOrigin()}/invite/${input.rawToken}`;
  const inviter = input.inviterName?.trim() || "An AGXORA administrator";
  return {
    kind: "invitation",
    to: input.to,
    subject: `Invitation to ${input.workspaceName} on AGXORA`,
    actionUrl,
    text: [
      `${inviter} invited you to join “${input.workspaceName}”`,
      `in organization “${input.organizationName}” as ${input.role}.`,
      "",
      `Accept the invitation:`,
      actionUrl,
      "",
      "If you did not expect this email, you can ignore it.",
      "— AGXORA",
    ].join("\n"),
  };
}

export function buildPasswordResetEmail(input: {
  readonly to: string;
  readonly rawToken: string;
}): EmailMessage {
  const actionUrl = `${getAppOrigin()}/reset-password?token=${encodeURIComponent(input.rawToken)}`;
  return {
    kind: "password_reset",
    to: input.to,
    subject: "Reset your AGXORA password",
    actionUrl,
    text: [
      "We received a request to reset your AGXORA password.",
      "",
      "Reset your password:",
      actionUrl,
      "",
      "This link expires in one hour. If you did not request a reset, ignore this email.",
      "— AGXORA",
    ].join("\n"),
  };
}

export function buildEmailVerificationEmail(input: {
  readonly to: string;
  readonly rawToken: string;
}): EmailMessage {
  const actionUrl = `${getAppOrigin()}/verify-email?token=${encodeURIComponent(input.rawToken)}`;
  return {
    kind: "email_verification",
    to: input.to,
    subject: "Verify your AGXORA email",
    actionUrl,
    text: [
      "Confirm your email address for AGXORA:",
      "",
      actionUrl,
      "",
      "This link expires in 24 hours.",
      "— AGXORA",
    ].join("\n"),
  };
}

export function buildOwnershipTransferEmail(input: {
  readonly to: string;
  readonly organizationName: string;
  readonly workspaceName: string;
  readonly fromUserName: string;
  readonly rawToken: string;
}): EmailMessage {
  const actionUrl = `${getAppOrigin()}/ownership-transfer/${input.rawToken}`;
  return {
    kind: "ownership_transfer",
    to: input.to,
    subject: `Confirm ownership transfer for ${input.organizationName}`,
    actionUrl,
    text: [
      `${input.fromUserName} initiated an organization ownership transfer to you`,
      `for “${input.organizationName}” (workspace “${input.workspaceName}”).`,
      "",
      "If you accept, you become the organization OWNER and the previous owner",
      "is demoted to ADMIN on that workspace.",
      "",
      "Confirm the transfer:",
      actionUrl,
      "",
      "This link expires in 48 hours. If you did not expect this, ignore the email.",
      "— AGXORA",
    ].join("\n"),
  };
}

/** Redacts one-time tokens from URLs for safe structured logs. */
export function redactActionUrl(url: string, kind: EmailKind): string {
  if (kind === "invitation" || kind === "ownership_transfer") {
    return url
      .replace(/\/invite\/[^/?#]+/i, "/invite/[redacted]")
      .replace(/\/ownership-transfer\/[^/?#]+/i, "/ownership-transfer/[redacted]");
  }
  return url.replace(/([?&]token=)[^&]+/i, "$1[redacted]");
}
