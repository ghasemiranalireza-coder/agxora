/**
 * Map between Prisma Customer and CrmCustomerRecord (UI contract).
 */

import type { Customer, CustomerStatus as DbStatus } from "@prisma/client";
import type { CrmCustomerRecord, CrmCustomerStatus, CrmTag } from "../directory/types";

function isTag(value: unknown): value is CrmTag {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CrmTag).label === "string" &&
    typeof (value as CrmTag).color === "string"
  );
}

export function parseTagsJson(value: unknown): readonly CrmTag[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTag);
}

export function toCrmCustomerRecord(row: Customer): CrmCustomerRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    companyName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    website: row.website,
    industry: row.industry,
    country: row.country,
    city: row.city,
    address: row.address,
    taxNumber: row.taxNumber,
    status: row.status as CrmCustomerStatus,
    owner: row.owner,
    tags: parseTagsJson(row.tags),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDbStatus(status: CrmCustomerStatus): DbStatus {
  return status;
}
