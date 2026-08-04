/**
 * Enterprise sales inquiries — local persistence until CRM intake is wired.
 * No database schema changes.
 */

import { saasCommercialStore } from "../store";

export interface SalesInquiryInput {
  readonly company: string;
  readonly employees: string;
  readonly country: string;
  readonly businessEmail: string;
  readonly message: string;
}

export interface SalesInquiryRecord extends SalesInquiryInput {
  readonly id: string;
  readonly createdAt: string;
}

const STORAGE_KEY = "agxora.saas.sales.inquiries.v1";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `inq_${crypto.randomUUID()}`;
  }
  return `inq_${Date.now().toString(36)}`;
}

function readAll(): SalesInquiryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SalesInquiryRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: readonly SalesInquiryRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function submitSalesInquiry(input: SalesInquiryInput): SalesInquiryRecord {
  const record: SalesInquiryRecord = {
    id: createId(),
    company: input.company.trim(),
    employees: input.employees.trim(),
    country: input.country.trim(),
    businessEmail: input.businessEmail.trim().toLowerCase(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  };
  writeAll([record, ...readAll()].slice(0, 50));
  saasCommercialStore.hydrate();
  saasCommercialStore.logAudit({
    action: "sales.inquiry",
    organizationId: "public",
    metadata: {
      company: record.company,
      email: record.businessEmail,
      country: record.country,
    },
  });
  return record;
}

export function listSalesInquiries(): readonly SalesInquiryRecord[] {
  return readAll();
}
