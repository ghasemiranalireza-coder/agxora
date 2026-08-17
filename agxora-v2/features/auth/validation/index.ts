/**
 * Auth validation helpers — backend-ready, no business hardcoding.
 */

export interface FieldValidation {
  readonly ok: boolean;
  readonly message?: string;
}

export function validateEmail(email: string): FieldValidation {
  const value = email.trim();
  if (!value) return { ok: false, message: "auth.validation.emailRequired" };
  if (!value.includes("@") || value.length < 5) {
    return { ok: false, message: "auth.validation.emailInvalid" };
  }
  return { ok: true };
}

export function validatePassword(password: string): FieldValidation {
  if (!password) return { ok: false, message: "auth.validation.passwordRequired" };
  if (password.length < 8) {
    return { ok: false, message: "auth.validation.passwordMin" };
  }
  return { ok: true };
}

export function validateDisplayName(name: string): FieldValidation {
  if (!name.trim()) return { ok: false, message: "auth.validation.nameRequired" };
  if (name.trim().length < 2) {
    return { ok: false, message: "auth.validation.nameMin" };
  }
  return { ok: true };
}

export function validatePasswordMatch(
  password: string,
  confirm: string,
): FieldValidation {
  if (password !== confirm) {
    return { ok: false, message: "auth.validation.passwordMismatch" };
  }
  return { ok: true };
}

export function validateSlug(slug: string): FieldValidation {
  const value = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return {
      ok: false,
      message: "auth.validation.slugFormat",
    };
  }
  return { ok: true };
}
