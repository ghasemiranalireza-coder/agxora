/**
 * Phase 45 — server-only email delivery surface.
 */

import "server-only";

export type {
  EmailDeliveryStatus,
  EmailKind,
  EmailMessage,
  EmailProvider,
  EmailProviderId,
  EmailSendResult,
} from "./types";

export { getAppOrigin, getEmailConfig } from "./config";
export { deliverEmail, isEmailDeliveryConfigured } from "./delivery";
export {
  getEmailProvider,
  setEmailProviderForTests,
} from "./provider";
export {
  buildEmailVerificationEmail,
  buildInvitationEmail,
  buildPasswordResetEmail,
  redactActionUrl,
} from "./templates";
export {
  forceMemoryEmailFailure,
  listMemoryEmailOutbox,
  memoryEmailProvider,
  resetMemoryEmailOutbox,
} from "./providers/memory";
export { noneEmailProvider } from "./providers/none";
export { consoleEmailProvider } from "./providers/console";
