/**
 * Customer — universal external party of an organization.
 * Guests, patients, clients, buyers, shippers all map here.
 */

import type { BusinessId } from "./Business";
import type { OrganizationId } from "./types";

export type CustomerId = string & { readonly __brand: "CustomerId" };

export function asCustomerId(value: string): CustomerId {
  return value as CustomerId;
}

export type CustomerKind = "individual" | "company" | "government" | "other";

export type CustomerStatus = "active" | "inactive" | "blocked" | "prospect";

export interface Customer {
  readonly id: CustomerId;
  readonly organizationId: OrganizationId;
  readonly businessId?: BusinessId;
  readonly kind: CustomerKind;
  readonly displayName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly status: CustomerStatus;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCustomerInput {
  readonly organizationId: OrganizationId;
  readonly displayName: string;
  readonly kind?: CustomerKind;
  readonly businessId?: BusinessId;
  readonly email?: string;
  readonly phone?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function createCustomer(
  input: CreateCustomerInput,
  id: CustomerId = asCustomerId(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `cus_${crypto.randomUUID()}`
      : `cus_${Date.now().toString(36)}`,
  ),
): Customer {
  const now = new Date().toISOString();
  return {
    id,
    organizationId: input.organizationId,
    businessId: input.businessId,
    kind: input.kind ?? "individual",
    displayName: input.displayName.trim(),
    email: input.email?.trim().toLowerCase(),
    phone: input.phone,
    status: "active",
    tags: input.tags,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
}
