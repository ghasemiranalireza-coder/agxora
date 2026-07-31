/**
 * Auth validation helpers — backend-ready, no business hardcoding.
 */

export interface FieldValidation {
  readonly ok: boolean;
  readonly message?: string;
}

export function validateEmail(email: string): FieldValidation {
  const value = email.trim();
  if (!value) return { ok: false, message: "Email is required." };
  if (!value.includes("@") || value.length < 5) {
    return { ok: false, message: "Enter a valid email address." };
  }
  return { ok: true };
}

export function validatePassword(password: string): FieldValidation {
  if (!password) return { ok: false, message: "Password is required." };
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  return { ok: true };
}

export function validateDisplayName(name: string): FieldValidation {
  if (!name.trim()) return { ok: false, message: "Name is required." };
  if (name.trim().length < 2) {
    return { ok: false, message: "Name must be at least 2 characters." };
  }
  return { ok: true };
}

export function validatePasswordMatch(
  password: string,
  confirm: string,
): FieldValidation {
  if (password !== confirm) {
    return { ok: false, message: "Passwords do not match." };
  }
  return { ok: true };
}

export function validateSlug(slug: string): FieldValidation {
  const value = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return {
      ok: false,
      message: "Use lowercase letters, numbers, and hyphens only.",
    };
  }
  return { ok: true };
}
