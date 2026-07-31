/**
 * Enterprise CRM 2.0 — API-ready customer domain model.
 */

export type CrmCustomerId = string;
export type CrmContactId = string;
export type CrmNoteId = string;
export type CrmDocumentId = string;
export type CrmActivityId = string;

export type CrmCustomerStatus =
  | "lead"
  | "prospect"
  | "active"
  | "inactive"
  | "vip"
  | "archived";

export type CrmViewMode = "table" | "cards";

export type CrmProfileTab =
  | "overview"
  | "contacts"
  | "projects"
  | "documents"
  | "invoices"
  | "activity"
  | "notes"
  | "settings";

export type CrmSortKey =
  | "companyName"
  | "contactName"
  | "email"
  | "phone"
  | "industry"
  | "status"
  | "owner"
  | "createdAt"
  | "country";

export type SortDirection = "asc" | "desc";

export type CrmActivityKind =
  | "customer_created"
  | "customer_updated"
  | "project_linked"
  | "document_added"
  | "document_deleted"
  | "note_added"
  | "note_updated"
  | "note_deleted"
  | "contact_added"
  | "contact_updated"
  | "contact_deleted";

export const CRM_STATUSES: readonly CrmCustomerStatus[] = [
  "lead",
  "prospect",
  "active",
  "inactive",
  "vip",
  "archived",
] as const;

export const CRM_TAG_COLORS = [
  "#22d3ee",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
  "#f472b6",
  "#2dd4bf",
] as const;

export interface CrmTag {
  readonly label: string;
  readonly color: string;
}

export interface CrmCustomerRecord {
  readonly id: CrmCustomerId;
  readonly organizationId: string;
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
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmContactRecord {
  readonly id: CrmContactId;
  readonly customerId: CrmCustomerId;
  readonly organizationId: string;
  readonly name: string;
  readonly role: string;
  readonly email: string;
  readonly phone: string;
  readonly mobile: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmNoteRecord {
  readonly id: CrmNoteId;
  readonly customerId: CrmCustomerId;
  readonly organizationId: string;
  readonly title: string;
  readonly body: string;
  readonly author: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmDocumentRecord {
  readonly id: CrmDocumentId;
  readonly customerId: CrmCustomerId;
  readonly organizationId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly uploadedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmActivityRecord {
  readonly id: CrmActivityId;
  readonly customerId: CrmCustomerId;
  readonly organizationId: string;
  readonly kind: CrmActivityKind;
  readonly title: string;
  readonly detail: string;
  readonly actor: string;
  readonly createdAt: string;
}

export type CrmCustomerDraft = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  country: string;
  city: string;
  address: string;
  taxNumber: string;
  status: CrmCustomerStatus;
  owner: string;
  tags: string;
};

export type CrmContactDraft = {
  name: string;
  role: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
};

export type CrmNoteDraft = {
  title: string;
  body: string;
  author: string;
};

export function statusLabel(status: CrmCustomerStatus): string {
  switch (status) {
    case "lead":
      return "Lead";
    case "prospect":
      return "Prospect";
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "vip":
      return "VIP";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function parseTags(raw: string): readonly CrmTag[] {
  return raw
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((label, index) => ({
      label,
      color: CRM_TAG_COLORS[index % CRM_TAG_COLORS.length],
    }));
}

export function tagsToDraft(tags: readonly CrmTag[]): string {
  return tags.map((tag) => tag.label).join(", ");
}

export function emptyCustomerDraft(
  defaults?: Partial<CrmCustomerDraft>,
): CrmCustomerDraft {
  return {
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    country: "",
    city: "",
    address: "",
    taxNumber: "",
    status: "lead",
    owner: "",
    tags: "",
    ...defaults,
  };
}

export function draftFromCustomer(
  customer: CrmCustomerRecord,
): CrmCustomerDraft {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    website: customer.website,
    industry: customer.industry,
    country: customer.country,
    city: customer.city,
    address: customer.address,
    taxNumber: customer.taxNumber,
    status: customer.status,
    owner: customer.owner,
    tags: tagsToDraft(customer.tags),
  };
}

export function emptyContactDraft(
  defaults?: Partial<CrmContactDraft>,
): CrmContactDraft {
  return {
    name: "",
    role: "",
    email: "",
    phone: "",
    mobile: "",
    notes: "",
    ...defaults,
  };
}

export function emptyNoteDraft(defaults?: Partial<CrmNoteDraft>): CrmNoteDraft {
  return {
    title: "",
    body: "",
    author: "",
    ...defaults,
  };
}
