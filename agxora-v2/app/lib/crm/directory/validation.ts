import type {
  CrmContactDraft,
  CrmCustomerDraft,
  CrmCustomerRecord,
  CrmCustomerStatus,
  CrmNoteDraft,
  CrmTag,
} from "./types";
import { CRM_STATUSES, parseTags } from "./types";

export type CrmFieldError = {
  readonly field: keyof CrmCustomerDraft | "form";
  readonly message: string;
};

export type CrmContactFieldError = {
  readonly field: keyof CrmContactDraft | "form";
  readonly message: string;
};

export type CrmNoteFieldError = {
  readonly field: keyof CrmNoteDraft | "form";
  readonly message: string;
};

export type ValidatedCustomerPayload = {
  readonly companyName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly website: string;
  readonly industry: string;
  readonly country: string;
  readonly city: string;
  readonly address: string;
  readonly taxNumber: string;
  readonly status: CrmCustomerStatus;
  readonly owner: string;
  readonly tags: readonly CrmTag[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()./-]{6,24}$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCustomerDraft(
  draft: CrmCustomerDraft,
  options?: {
    readonly existing?: readonly CrmCustomerRecord[];
    readonly excludeId?: string;
  },
):
  | { readonly ok: true; readonly value: ValidatedCustomerPayload }
  | { readonly ok: false; readonly errors: readonly CrmFieldError[] } {
  const errors: CrmFieldError[] = [];
  const companyName = draft.companyName.trim();
  const contactName = draft.contactName.trim();
  const email = normalizeEmail(draft.email);
  const phone = draft.phone.trim();
  const website = draft.website.trim();
  const industry = draft.industry.trim();
  const country = draft.country.trim();
  const city = draft.city.trim();
  const address = draft.address.trim();
  const taxNumber = draft.taxNumber.trim();
  const status = draft.status;
  const owner = draft.owner.trim();
  const tags = parseTags(draft.tags);

  if (!companyName) {
    errors.push({ field: "companyName", message: "Company name is required." });
  }
  if (!contactName) {
    errors.push({ field: "contactName", message: "Contact name is required." });
  }
  if (!email) {
    errors.push({ field: "email", message: "Email is required." });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }
  if (!phone) {
    errors.push({ field: "phone", message: "Phone is required." });
  } else if (!PHONE_RE.test(phone)) {
    errors.push({ field: "phone", message: "Enter a valid phone number." });
  }
  if (website && !URL_RE.test(website)) {
    errors.push({ field: "website", message: "Enter a valid website." });
  }
  if (!industry) {
    errors.push({ field: "industry", message: "Industry is required." });
  }
  if (!owner) {
    errors.push({ field: "owner", message: "Owner is required." });
  }
  if (!CRM_STATUSES.includes(status)) {
    errors.push({ field: "status", message: "Select a valid status." });
  }

  const duplicates = (options?.existing ?? []).filter((row) => {
    if (options?.excludeId && row.id === options.excludeId) return false;
    return normalizeEmail(row.email) === email;
  });
  if (duplicates.length > 0) {
    errors.push({
      field: "email",
      message: "A customer with this email already exists.",
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      companyName,
      contactName,
      email,
      phone,
      website,
      industry,
      country,
      city,
      address,
      taxNumber,
      status,
      owner,
      tags,
    },
  };
}

export function validateContactDraft(draft: CrmContactDraft):
  | {
      readonly ok: true;
      readonly value: {
        name: string;
        role: string;
        email: string;
        phone: string;
        mobile: string;
        notes: string;
      };
    }
  | { readonly ok: false; readonly errors: readonly CrmContactFieldError[] } {
  const errors: CrmContactFieldError[] = [];
  const name = draft.name.trim();
  const role = draft.role.trim();
  const email = normalizeEmail(draft.email);
  const phone = draft.phone.trim();
  const mobile = draft.mobile.trim();
  const notes = draft.notes.trim();

  if (!name) errors.push({ field: "name", message: "Name is required." });
  if (email && !EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }
  if (phone && !PHONE_RE.test(phone)) {
    errors.push({ field: "phone", message: "Enter a valid phone number." });
  }
  if (mobile && !PHONE_RE.test(mobile)) {
    errors.push({ field: "mobile", message: "Enter a valid mobile number." });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, role, email, phone, mobile, notes } };
}

export function validateNoteDraft(draft: CrmNoteDraft):
  | {
      readonly ok: true;
      readonly value: { title: string; body: string; author: string };
    }
  | { readonly ok: false; readonly errors: readonly CrmNoteFieldError[] } {
  const errors: CrmNoteFieldError[] = [];
  const title = draft.title.trim();
  const body = draft.body.trim();
  const author = draft.author.trim();
  if (!title) errors.push({ field: "title", message: "Title is required." });
  if (!body) errors.push({ field: "body", message: "Note body is required." });
  if (!author) errors.push({ field: "author", message: "Author is required." });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { title, body, author } };
}

export function customerErrorMap(
  errors: readonly CrmFieldError[],
): Partial<Record<keyof CrmCustomerDraft | "form", string>> {
  const map: Partial<Record<keyof CrmCustomerDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}

export function contactErrorMap(
  errors: readonly CrmContactFieldError[],
): Partial<Record<keyof CrmContactDraft | "form", string>> {
  const map: Partial<Record<keyof CrmContactDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}

export function noteErrorMap(
  errors: readonly CrmNoteFieldError[],
): Partial<Record<keyof CrmNoteDraft | "form", string>> {
  const map: Partial<Record<keyof CrmNoteDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}
