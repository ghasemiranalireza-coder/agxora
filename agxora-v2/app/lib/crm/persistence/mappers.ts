/**
 * Map between Prisma models and CRM directory UI contracts.
 */

import type { Contact, Customer, CustomerDocument, CustomerStatus as DbStatus, Note } from "@prisma/client";
import type {
  CrmContactRecord,
  CrmCustomerRecord,
  CrmCustomerStatus,
  CrmDocumentRecord,
  CrmNoteRecord,
  CrmTag,
} from "../directory/types";

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

export function toCrmContactRecord(row: Contact): CrmContactRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    organizationId: row.organizationId,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCrmNoteRecord(row: Note): CrmNoteRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    organizationId: row.organizationId,
    title: row.title,
    body: row.body,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCrmDocumentRecord(row: CustomerDocument): CrmDocumentRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    organizationId: row.organizationId,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDbStatus(status: CrmCustomerStatus): DbStatus {
  return status;
}
