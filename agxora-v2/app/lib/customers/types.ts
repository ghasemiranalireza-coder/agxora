/**
 * Customer CRM domain model — database-ready.
 * Persistence can swap memory/local → SQL/API without UI changes.
 */

export type CustomerId = string;

export type CustomerStatus = "active" | "prospect" | "inactive" | "blocked";

export const CUSTOMER_STATUSES: readonly CustomerStatus[] = [
  "active",
  "prospect",
  "inactive",
  "blocked",
] as const;

export interface CustomerAddress {
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly country: string;
}

export interface CustomerRecord {
  readonly id: CustomerId;
  readonly organizationId: string;
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
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CustomerDraft = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  mobile: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  taxNumber: string;
  vatId: string;
  notes: string;
  status: CustomerStatus;
  tags: string;
};

export type CustomerCreateInput = Omit<
  CustomerRecord,
  "id" | "createdAt" | "updatedAt" | "tags"
> & {
  readonly tags?: readonly string[];
};

export type CustomerUpdateInput = Partial<
  Omit<CustomerRecord, "id" | "organizationId" | "createdAt" | "updatedAt">
>;

export type CustomerSortKey =
  | "companyName"
  | "contactPerson"
  | "email"
  | "city"
  | "status"
  | "updatedAt";

export type SortDirection = "asc" | "desc";

export function emptyCustomerDraft(
  defaults?: Partial<CustomerDraft>,
): CustomerDraft {
  return {
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    mobile: "",
    street: "",
    postalCode: "",
    city: "",
    country: "",
    taxNumber: "",
    vatId: "",
    notes: "",
    status: "prospect",
    tags: "",
    ...defaults,
  };
}

export function draftFromCustomer(customer: CustomerRecord): CustomerDraft {
  return {
    companyName: customer.companyName,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,
    mobile: customer.mobile,
    street: customer.street,
    postalCode: customer.postalCode,
    city: customer.city,
    country: customer.country,
    taxNumber: customer.taxNumber,
    vatId: customer.vatId,
    notes: customer.notes,
    status: customer.status,
    tags: customer.tags.join(", "),
  };
}

export function parseTags(raw: string): readonly string[] {
  return raw
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
