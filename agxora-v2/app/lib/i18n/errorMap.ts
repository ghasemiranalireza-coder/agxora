/**
 * Map thrown/API English (or codes) onto stable i18n keys.
 * Does not change auth/CRM business logic — UI localization only.
 */

const MESSAGE_TO_KEY: Record<string, string> = {
  "Invalid email or password": "errors.codes.AUTH_INVALID_CREDENTIALS",
  "Invalid email or password.": "errors.codes.AUTH_INVALID_CREDENTIALS",
  "A valid email is required": "errors.invalidEmail",
  "Password must be at least 8 characters": "errors.passwordMin",
  "Display name is required": "auth.validation.nameRequired",
  "An account with this email already exists": "errors.codes.AUTH_INVALID_CREDENTIALS",
  "Invalid or expired reset token": "auth.reset.failed",
  "Not authenticated": "errors.codes.AUTH_SIGN_IN_REQUIRED",
  "Invalid or expired verification token": "auth.verifyEmail.verificationFailed",
  "User not found": "errors.codes.AUTH_INVALID_CREDENTIALS",
  "Registration failed": "auth.register.failed",
  "Verification failed": "auth.verifyEmail.verificationFailed",
  "Sign in failed": "auth.login.failed",
  "Sign up failed": "auth.register.failed",
  "Auth hydrate failed": "errors.codes.COMMON_SOMETHING_WENT_WRONG",
  "Unable to send message": "errors.codes.COMMON_SOMETHING_WENT_WRONG",
  "Failed to load organization": "errors.codes.COMMON_SOMETHING_WENT_WRONG",
  "Failed to load projects.": "projects.list.errorTitle",
  "This account is locked. Contact an administrator.":
    "errors.codes.AUTH_ACCOUNT_LOCKED",
  "Your session expired. Sign in again.": "errors.codes.AUTH_SESSION_EXPIRED",
  "Sign in to continue.": "errors.codes.AUTH_SIGN_IN_REQUIRED",
  "Your role cannot access this resource.": "errors.roleCannotAccess",
  "Sign in required.": "errors.signInRequired",
  "You do not have access to this route.": "errors.noRouteAccess",
  "Insufficient permissions.": "errors.insufficientPermissions",
  "You must accept the terms to continue.": "errors.acceptTerms",
  "Message content is required": "errors.required",
  "Valid email required": "errors.invalidEmail",
  "Invitation expired": "team.invite.failed",
  "Unknown connector": "integrations.errors.unknownConnector",
  "Webhook not found": "integrations.errors.webhookNotFound",
  "API key inactive or expired": "integrations.errors.apiKeyInactive",
};

const CODE_TO_KEY: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "errors.codes.AUTH_INVALID_CREDENTIALS",
  AUTH_SESSION_EXPIRED: "errors.codes.AUTH_SESSION_EXPIRED",
  AUTH_ACCOUNT_LOCKED: "errors.codes.AUTH_ACCOUNT_LOCKED",
  AUTH_SIGN_IN_REQUIRED: "errors.codes.AUTH_SIGN_IN_REQUIRED",
  AUTH_INSUFFICIENT_PERMISSIONS: "errors.codes.AUTH_INSUFFICIENT_PERMISSIONS",
  AUTH_NO_ROUTE_ACCESS: "errors.codes.AUTH_NO_ROUTE_ACCESS",
  COMMON_SOMETHING_WENT_WRONG: "errors.codes.COMMON_SOMETHING_WENT_WRONG",
  COMMON_PAGE_NOT_FOUND: "errors.codes.COMMON_PAGE_NOT_FOUND",
  COMMON_OFFLINE: "errors.codes.COMMON_OFFLINE",
  COMMON_TIMEOUT: "errors.codes.COMMON_TIMEOUT",
  COMMON_VALIDATION: "errors.codes.COMMON_VALIDATION",
  COMMON_UNKNOWN: "errors.codes.COMMON_UNKNOWN",
  COMMON_INTERNAL: "errors.codes.COMMON_INTERNAL",
  NOT_FOUND: "errors.codes.COMMON_PAGE_NOT_FOUND",
  INTERNAL: "errors.codes.COMMON_INTERNAL",
  UNAUTHORIZED: "errors.codes.AUTH_SIGN_IN_REQUIRED",
  FORBIDDEN: "errors.codes.AUTH_INSUFFICIENT_PERMISSIONS",
  OFFLINE: "errors.codes.COMMON_OFFLINE",
  VALIDATION: "errors.codes.COMMON_VALIDATION",
  TIMEOUT: "errors.codes.COMMON_TIMEOUT",
  UNKNOWN: "errors.codes.COMMON_UNKNOWN",
};

export function isTranslationKey(value: string): boolean {
  return /^[a-z][a-zA-Z0-9_.-]*\.[a-zA-Z0-9_.-]+$/.test(value) && !value.includes(" ");
}

export function resolveUserFacingErrorKey(
  err: unknown,
  fallback = "errors.codes.COMMON_SOMETHING_WENT_WRONG",
): string {
  if (err && typeof err === "object") {
    const rec = err as { code?: unknown; message?: unknown };
    if (typeof rec.code === "string" && CODE_TO_KEY[rec.code]) {
      return CODE_TO_KEY[rec.code];
    }
    if (typeof rec.code === "string" && rec.code.startsWith("errors.")) {
      return rec.code;
    }
    if (typeof rec.message === "string") {
      if (isTranslationKey(rec.message)) return rec.message;
      if (MESSAGE_TO_KEY[rec.message]) return MESSAGE_TO_KEY[rec.message];
      if (rec.message.startsWith("Unknown connector:")) {
        return "integrations.errors.unknownConnector";
      }
    }
  }
  if (typeof err === "string") {
    if (isTranslationKey(err)) return err;
    if (MESSAGE_TO_KEY[err]) return MESSAGE_TO_KEY[err];
    if (err.startsWith("Unknown connector:")) {
      return "integrations.errors.unknownConnector";
    }
    if (CODE_TO_KEY[err]) return CODE_TO_KEY[err];
  }
  return fallback;
}

/** Translate a thrown/API error for UI display. Never leak raw English. */
export function localizeThrownError(
  t: (key: string, values?: Readonly<Record<string, string | number>>) => string,
  err: unknown,
  fallback = "errors.codes.COMMON_SOMETHING_WENT_WRONG",
): string {
  return t(resolveUserFacingErrorKey(err, fallback));
}
