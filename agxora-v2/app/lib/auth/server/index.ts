/**
 * Phase 43 auth server surface.
 */

export {
  hashPassword,
  verifyPassword,
  assertPasswordPolicy,
} from "./password";
export { createOpaqueToken, hashOpaqueToken } from "./tokens";
export {
  applySessionCookie,
  clearSessionCookie,
  readSessionCookieValue,
  sessionCookieOptions,
  SESSION_MAX_AGE_SECONDS,
} from "./cookies";
export {
  registerWithPassword,
  loginWithPassword,
  logoutSession,
  revokeAllUserSessions,
  getSessionPublic,
  requestPasswordReset,
  resetPasswordWithToken,
  createEmailVerificationToken,
  verifyEmailWithToken,
  switchActiveWorkspace,
  type AuthSuccess,
  type PublicAuthUser,
  type PublicAuthSession,
} from "./service";
export {
  listManagedSessions,
  listManagedSessionsForToken,
  revokeManagedSession,
  revokeManagedSessionForToken,
  revokeOtherManagedSessions,
  revokeOtherManagedSessionsForToken,
  type PublicManagedSession,
  type ManagedSessionList,
} from "./managedSessions";
