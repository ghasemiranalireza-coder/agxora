/**
 * First-customer invoice UX helpers.
 *
 * Invoices stay on the existing Prisma Finance path:
 * CRM customer → delivery note → bill → invoice detail.
 * Query params may carry a customerId. Organization/workspace IDs are ignored.
 */

import type { InvoiceStatus } from "../finance/core/types";

export const FIRST_CUSTOMER_DELIVERY_NOTES_HREF =
  "/dashboard/finance/delivery-notes" as const;
export const FIRST_CUSTOMER_INVOICES_HREF =
  "/dashboard/finance/invoices" as const;

const CUSTOMER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const KNOWN_INVOICE_STATUSES = [
  "DRAFT",
  "OPEN",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const satisfies readonly InvoiceStatus[];

export type FirstInvoiceDraftIssue =
  | "missingCustomer"
  | "missingLine"
  | "invalidAmount";

export function parseFinanceCustomerId(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!CUSTOMER_UUID_RE.test(trimmed)) return null;
  return trimmed;
}

/** Read only customerId. Never treat organizationId/workspaceId as ownership. */
export function parseFinanceCustomerIdFromSearch(
  params: URLSearchParams | { get(name: string): string | null },
): string | null {
  return parseFinanceCustomerId(params.get("customerId"));
}

export function parseFinanceInvoiceStatus(
  value: string | null | undefined,
): InvoiceStatus | "all" | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "all") return "all";
  if ((KNOWN_INVOICE_STATUSES as readonly string[]).includes(trimmed)) {
    return trimmed as InvoiceStatus;
  }
  return null;
}

export function createInvoiceHrefForCustomer(customerId: string): string {
  const id = parseFinanceCustomerId(customerId);
  if (!id) return FIRST_CUSTOMER_DELIVERY_NOTES_HREF;
  return `${FIRST_CUSTOMER_DELIVERY_NOTES_HREF}?customerId=${encodeURIComponent(id)}&create=1`;
}

export function invoicesHrefForCustomer(customerId: string): string {
  const id = parseFinanceCustomerId(customerId);
  if (!id) return FIRST_CUSTOMER_INVOICES_HREF;
  return `${FIRST_CUSTOMER_INVOICES_HREF}?customerId=${encodeURIComponent(id)}`;
}

export function invoiceDetailHref(invoiceId: string): string {
  const id = parseFinanceCustomerId(invoiceId);
  if (!id) return FIRST_CUSTOMER_INVOICES_HREF;
  return `${FIRST_CUSTOMER_INVOICES_HREF}/${id}`;
}

export function isKnownInvoiceStatus(value: string): value is InvoiceStatus {
  return (KNOWN_INVOICE_STATUSES as readonly string[]).includes(value);
}

/** Paid is only shown when Finance persisted PAID. Never invent sent/paid. */
export function isInvoiceMarkedPaid(status: string): boolean {
  return status === "PAID";
}

export function invoiceStatusMessageKey(
  status: string,
): `finance.core.invoiceStatus.${InvoiceStatus}` | "finance.core.invoice.unknownStatus" {
  if (isKnownInvoiceStatus(status)) {
    return `finance.core.invoiceStatus.${status}`;
  }
  return "finance.core.invoice.unknownStatus";
}

export function firstInvoiceDraftIssue(draft: {
  readonly customerId?: string;
  readonly items?: readonly {
    readonly description?: string;
    readonly quantity?: string;
    readonly unitPriceNet?: string;
  }[];
}): FirstInvoiceDraftIssue | null {
  if (!parseFinanceCustomerId(draft.customerId)) return "missingCustomer";
  if (!Array.isArray(draft.items) || draft.items.length === 0) return "missingLine";
  const hasDescription = draft.items.some(
    (item) => (item.description ?? "").trim().length > 0,
  );
  if (!hasDescription) return "missingLine";
  const invalidAmount = draft.items.some((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPriceNet);
    return !Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity < 0 || unitPrice < 0;
  });
  if (invalidAmount) return "invalidAmount";
  return null;
}

export function firstInvoiceDraftIssueMessageKey(
  issue: FirstInvoiceDraftIssue,
):
  | "finance.core.errors.missingCustomer"
  | "finance.core.errors.missingLine"
  | "finance.core.errors.invalidAmount" {
  if (issue === "missingCustomer") return "finance.core.errors.missingCustomer";
  if (issue === "missingLine") return "finance.core.errors.missingLine";
  return "finance.core.errors.invalidAmount";
}
