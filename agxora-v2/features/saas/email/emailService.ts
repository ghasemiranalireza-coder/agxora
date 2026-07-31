/**
 * Email service architecture — templates + mock delivery queue.
 */

import { saasCommercialStore } from "../store";
import type { EmailMessage, EmailTemplateId } from "../types";

const SUBJECTS: Record<EmailTemplateId, string> = {
  welcome: "Welcome to AGXORA",
  verify_email: "Verify your email",
  password_reset: "Reset your password",
  invoice: "Your AGXORA invoice",
  billing_notification: "Billing update",
  trial_ending: "Your trial is ending soon",
  payment_failed: "Payment failed",
};

export function renderEmailTemplate(
  templateId: EmailTemplateId,
  vars: Readonly<Record<string, string>> = {},
): { subject: string; body: string } {
  const subject = SUBJECTS[templateId];
  const lines = [
    `Template: ${templateId}`,
    ...Object.entries(vars).map(([k, v]) => `${k}: ${v}`),
    "",
    "This message was queued by the AGXORA email architecture (mock delivery).",
  ];
  return { subject, body: lines.join("\n") };
}

export function sendBillingEmail(input: {
  templateId: EmailTemplateId;
  to: string;
  subject?: string;
  body?: string;
  vars?: Readonly<Record<string, string>>;
}): EmailMessage {
  const rendered = renderEmailTemplate(input.templateId, input.vars);
  return saasCommercialStore.queueEmail({
    templateId: input.templateId,
    to: input.to,
    subject: input.subject ?? rendered.subject,
    body: input.body ?? rendered.body,
    status: "mock",
  });
}

export function listQueuedEmails(): readonly EmailMessage[] {
  return saasCommercialStore.listEmails();
}
