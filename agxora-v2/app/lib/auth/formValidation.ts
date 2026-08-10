/**
 * Client-side auth form validation helpers.
 * Returns i18n message keys (e.g. "errors.invalidEmail") for UI translation via t().
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export type PasswordStrength = "weak" | "fair" | "strong";

export function assessPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (password.length >= 12 && hasLetter && hasNumber && hasSymbol) return "strong";
  if (hasLetter && hasNumber) return "fair";
  return "weak";
}

/** @returns i18n key under `errors.*`, or null when valid */
export function passwordStrengthMessage(password: string): string | null {
  if (!password) return "errors.required";
  if (password.length < 8) return "errors.passwordMin";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "errors.passwordLettersNumbers";
  }
  return null;
}
