/**
 * Customer form validation — reusable, UI-agnostic.
 */

import type { CustomerDraft, CustomerRecord, CustomerStatus } from "./types";
import { CUSTOMER_STATUSES, parseTags } from "./types";

export type CustomerFieldError = {
  readonly field: keyof CustomerDraft | "form";
  readonly message: string;
};

export type CustomerValidationResult =
  | { readonly ok: true; readonly value: ValidatedCustomerPayload }
  | { readonly ok: false; readonly errors: readonly CustomerFieldError[] };

export type ValidatedCustomerPayload = {
  readonly companyName: string;
  readonly contactPerson: string;
  readonly email: string;
  readonly phone: string;
  readonly mobile: string;
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly country: string;
  readonly taxNumber: string;
  readonly vatId: string;
  readonly notes: string;
  readonly status: CustomerStatus;
  readonly tags: readonly string[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()./-]{6,24}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCustomerDraft(
  draft: CustomerDraft,
  options?: {
    readonly existing?: readonly CustomerRecord[];
    readonly excludeId?: string;
  },
): CustomerValidationResult {
  const errors: CustomerFieldError[] = [];

  const companyName = draft.companyName.trim();
  const contactPerson = draft.contactPerson.trim();
  const email = normalizeEmail(draft.email);
  const phone = draft.phone.trim();
  const mobile = draft.mobile.trim();
  const street = draft.street.trim();
  const postalCode = draft.postalCode.trim();
  const city = draft.city.trim();
  const country = draft.country.trim();
  const taxNumber = draft.taxNumber.trim();
  const vatId = draft.vatId.trim();
  const notes = draft.notes.trim();
  const status = draft.status;
  const tags = parseTags(draft.tags);

  if (!companyName) {
    errors.push({ field: "companyName", message: "customers.validation.companyRequired" });
  }
  if (!contactPerson) {
    errors.push({
      field: "contactPerson",
      message: "customers.validation.contactRequired",
    });
  }
  if (!email) {
    errors.push({ field: "email", message: "customers.validation.emailRequired" });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "customers.validation.emailInvalid" });
  }
  if (!phone) {
    errors.push({ field: "phone", message: "customers.validation.phoneRequired" });
  } else if (!PHONE_RE.test(phone)) {
    errors.push({ field: "phone", message: "customers.validation.phoneInvalid" });
  }
  if (mobile && !PHONE_RE.test(mobile)) {
    errors.push({ field: "mobile", message: "customers.validation.mobileInvalid" });
  }
  if (!CUSTOMER_STATUSES.includes(status)) {
    errors.push({ field: "status", message: "customers.validation.statusInvalid" });
  }

  // Duplicate prevention — email and company name uniqueness within organization.
  const peers = (options?.existing ?? []).filter(
    (row) => !(options?.excludeId && row.id === options.excludeId),
  );
  if (email && peers.some((row) => normalizeEmail(row.email) === email)) {
    errors.push({
      field: "email",
      message: "customers.validation.emailDuplicate",
    });
  }
  if (
    companyName &&
    peers.some(
      (row) =>
        row.companyName.trim().toLowerCase() === companyName.toLowerCase(),
    )
  ) {
    errors.push({
      field: "companyName",
      message: "customers.validation.companyDuplicate",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      companyName,
      contactPerson,
      email,
      phone,
      mobile,
      street,
      postalCode,
      city,
      country,
      taxNumber,
      vatId,
      notes,
      status,
      tags,
    },
  };
}

export function errorMap(
  errors: readonly CustomerFieldError[],
): Partial<Record<keyof CustomerDraft | "form", string>> {
  const map: Partial<Record<keyof CustomerDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}
