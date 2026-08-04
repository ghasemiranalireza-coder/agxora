/**
 * Client-side auth form validation helpers.
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

export function passwordStrengthMessage(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Use letters and numbers for a stronger password.";
  }
  return null;
}
