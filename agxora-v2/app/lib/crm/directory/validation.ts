import type {
  CrmContactDraft,
  CrmCustomerDraft,
  CrmCustomerRecord,
  CrmCustomerStatus,
  CrmDocumentDraft,
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

export type CrmDocumentFieldError = {
  readonly field: keyof CrmDocumentDraft | "form";
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

export type ValidatedContactPayload = {
  readonly name: string;
  readonly role: string;
  readonly email: string;
  readonly phone: string;
  readonly mobile: string;
  readonly notes: string;
};

export type ValidatedNotePayload = {
  readonly title: string;
  readonly body: string;
  readonly author: string;
};

export type ValidatedDocumentPayload = {
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly uploadedBy: string;
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
    errors.push({
      field: "companyName",
      message: "crm.validation.companyNameRequired",
    });
  }
  if (!contactName) {
    errors.push({
      field: "contactName",
      message: "crm.validation.contactNameRequired",
    });
  }
  if (!email) {
    errors.push({ field: "email", message: "crm.validation.emailRequired" });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "crm.validation.emailInvalid" });
  }
  if (!phone) {
    errors.push({ field: "phone", message: "crm.validation.phoneRequired" });
  } else if (!PHONE_RE.test(phone)) {
    errors.push({ field: "phone", message: "crm.validation.phoneInvalid" });
  }
  if (website && !URL_RE.test(website)) {
    errors.push({ field: "website", message: "crm.validation.websiteInvalid" });
  }
  if (!industry) {
    errors.push({ field: "industry", message: "crm.validation.industryRequired" });
  }
  if (!owner) {
    errors.push({ field: "owner", message: "crm.validation.ownerRequired" });
  }
  if (!CRM_STATUSES.includes(status)) {
    errors.push({ field: "status", message: "crm.validation.statusInvalid" });
  }

  const duplicates = (options?.existing ?? []).filter((row) => {
    if (options?.excludeId && row.id === options.excludeId) return false;
    return normalizeEmail(row.email) === email;
  });
  if (duplicates.length > 0) {
    errors.push({
      field: "email",
      message: "crm.validation.emailDuplicate",
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
      readonly value: ValidatedContactPayload;
    }
  | { readonly ok: false; readonly errors: readonly CrmContactFieldError[] } {
  const errors: CrmContactFieldError[] = [];
  const name = draft.name.trim();
  const role = draft.role.trim();
  const email = normalizeEmail(draft.email);
  const phone = draft.phone.trim();
  const mobile = draft.mobile.trim();
  const notes = draft.notes.trim();

  if (!name) errors.push({ field: "name", message: "crm.validation.nameRequired" });
  if (email && !EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "crm.validation.emailInvalid" });
  }
  if (phone && !PHONE_RE.test(phone)) {
    errors.push({ field: "phone", message: "crm.validation.phoneInvalid" });
  }
  if (mobile && !PHONE_RE.test(mobile)) {
    errors.push({ field: "mobile", message: "crm.validation.mobileInvalid" });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, role, email, phone, mobile, notes } };
}

export function validateNoteDraft(draft: CrmNoteDraft):
  | {
      readonly ok: true;
      readonly value: ValidatedNotePayload;
    }
  | { readonly ok: false; readonly errors: readonly CrmNoteFieldError[] } {
  const errors: CrmNoteFieldError[] = [];
  const title = draft.title.trim();
  const body = draft.body.trim();
  const author = draft.author.trim();
  if (!title)
    errors.push({ field: "title", message: "crm.validation.noteTitleRequired" });
  if (!body) errors.push({ field: "body", message: "crm.validation.noteBodyRequired" });
  if (!author) errors.push({ field: "author", message: "crm.validation.noteAuthorRequired" });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { title, body, author } };
}

export function validateDocumentDraft(draft: CrmDocumentDraft):
  | {
      readonly ok: true;
      readonly value: ValidatedDocumentPayload;
    }
  | { readonly ok: false; readonly errors: readonly CrmDocumentFieldError[] } {
  const errors: CrmDocumentFieldError[] = [];
  const name = draft.name.trim();
  const mimeType = (draft.mimeType || "application/octet-stream").trim();
  const size =
    typeof draft.size === "number" && Number.isFinite(draft.size)
      ? Math.max(0, Math.floor(draft.size))
      : -1;
  const uploadedBy = draft.uploadedBy.trim() || "System";

  if (!name) {
    errors.push({ field: "name", message: "crm.validation.documentNameRequired" });
  }
  if (size < 0) {
    errors.push({ field: "size", message: "crm.validation.documentSizeInvalid" });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, mimeType, size, uploadedBy } };
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

export function documentErrorMap(
  errors: readonly CrmDocumentFieldError[],
): Partial<Record<keyof CrmDocumentDraft | "form", string>> {
  const map: Partial<Record<keyof CrmDocumentDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}
