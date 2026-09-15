import { PersistenceError } from "@/app/lib/tenancy/errors";
import { moneyDecimal, DEFAULT_TAX_RATE } from "../money";
import type {
  DeliveryNoteDraft,
  DeliveryNoteStatus,
  FinanceLineDraft,
  InvoiceStatus,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid(value: string, field: string): string {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    throw new PersistenceError("validation", `Invalid ${field}`);
  }
  return trimmed;
}

export function parseIsoDate(value: string | undefined, field: string, fallback?: Date): Date {
  if (!value || !value.trim()) {
    return fallback ?? new Date();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PersistenceError("validation", `Invalid ${field}`);
  }
  return parsed;
}

export function dateOnlyIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseIdempotencyKey(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    throw new PersistenceError("validation", "Idempotency key must be 8–128 characters");
  }
  return trimmed;
}

const DELIVERY_STATUSES: readonly DeliveryNoteStatus[] = [
  "DRAFT",
  "OPEN",
  "ABGERECHNET",
  "CANCELLED",
];

const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "DRAFT",
  "OPEN",
  "PAID",
  "OVERDUE",
  "CANCELLED",
];

export function parseDeliveryStatus(value: string | undefined): DeliveryNoteStatus | undefined {
  if (!value) return undefined;
  if ((DELIVERY_STATUSES as readonly string[]).includes(value)) {
    return value as DeliveryNoteStatus;
  }
  throw new PersistenceError("validation", "Invalid delivery note status");
}

export function parseInvoiceStatus(value: string | undefined): InvoiceStatus | undefined {
  if (!value) return undefined;
  if ((INVOICE_STATUSES as readonly string[]).includes(value)) {
    return value as InvoiceStatus;
  }
  throw new PersistenceError("validation", "Invalid invoice status");
}

export function normalizeLineDraft(item: FinanceLineDraft, index: number): FinanceLineDraft {
  const description = item.description?.trim() ?? "";
  if (!description) {
    throw new PersistenceError("validation", `Line ${index + 1} is missing a description`);
  }
  if (description.length > 500) {
    throw new PersistenceError("validation", `Line ${index + 1} description is too long`);
  }
  const quantity = moneyDecimal(item.quantity);
  const unitPriceNet = moneyDecimal(item.unitPriceNet);
  const taxRate = moneyDecimal(item.taxRate?.trim() ? item.taxRate : DEFAULT_TAX_RATE);
  if (quantity.lt(0) || unitPriceNet.lt(0)) {
    throw new PersistenceError("validation", `Line ${index + 1} quantity and price must be >= 0`);
  }
  const unit = (item.unit ?? "Stk").trim() || "Stk";
  if (unit.length > 32) {
    throw new PersistenceError("validation", `Line ${index + 1} unit is too long`);
  }
  return {
    description,
    quantity: quantity.toString(),
    unit,
    unitPriceNet: unitPriceNet.toString(),
    taxRate: taxRate.toString(),
  };
}

export function validateDeliveryNoteDraft(draft: DeliveryNoteDraft): {
  readonly customerId: string;
  readonly date: Date;
  readonly orderNumber: string;
  readonly status: DeliveryNoteStatus;
  readonly notes: string;
  readonly items: readonly FinanceLineDraft[];
} {
  if (!draft || typeof draft !== "object") {
    throw new PersistenceError("validation", "Missing delivery note payload");
  }
  const customerId = assertUuid(draft.customerId ?? "", "customerId");
  if (!Array.isArray(draft.items) || draft.items.length === 0) {
    throw new PersistenceError("validation", "A delivery note needs at least one line item");
  }
  if (draft.items.length > 200) {
    throw new PersistenceError("validation", "Too many line items");
  }
  const status = parseDeliveryStatus(draft.status) ?? "OPEN";
  if (status === "ABGERECHNET") {
    throw new PersistenceError(
      "validation",
      "Cannot create a delivery note as already billed",
    );
  }
  const notes = (draft.notes ?? "").trim();
  if (notes.length > 4000) {
    throw new PersistenceError("validation", "Notes are too long");
  }
  const orderNumber = (draft.orderNumber ?? "").trim();
  if (orderNumber.length > 120) {
    throw new PersistenceError("validation", "Order number is too long");
  }
  return {
    customerId,
    date: parseIsoDate(draft.date, "date"),
    orderNumber,
    status,
    notes,
    items: draft.items.map((item, index) => normalizeLineDraft(item, index)),
  };
}

export function uniqueSortedIds(ids: readonly string[]): string[] {
  const unique = [...new Set(ids.map((id) => assertUuid(id, "deliveryNoteId")))];
  unique.sort();
  return unique;
}
