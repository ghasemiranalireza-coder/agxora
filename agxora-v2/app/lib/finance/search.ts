import type {
  FinanceInvoice,
  InvoiceSortKey,
  InvoiceStatus,
  PaymentStatus,
  SortDirection,
} from "./types";

export interface InvoiceFilterState {
  readonly search: string;
  readonly status: InvoiceStatus | "all";
  readonly paymentStatus: PaymentStatus | "all";
  readonly sortKey: InvoiceSortKey;
  readonly sortDir: SortDirection;
}

export const DEFAULT_INVOICE_FILTERS: InvoiceFilterState = {
  search: "",
  status: "all",
  paymentStatus: "all",
  sortKey: "dueDate",
  sortDir: "asc",
};

function compareValues(a: string | number, b: string | number, dir: SortDirection): number {
  const factor = dir === "asc" ? 1 : -1;
  if (a < b) return -1 * factor;
  if (a > b) return 1 * factor;
  return 0;
}

export function filterAndSortInvoices(
  invoices: readonly FinanceInvoice[],
  filters: InvoiceFilterState,
): FinanceInvoice[] {
  const q = filters.search.trim().toLowerCase();

  const filtered = invoices.filter((inv) => {
    if (filters.status !== "all" && inv.status !== filters.status) return false;
    if (filters.paymentStatus !== "all" && inv.paymentStatus !== filters.paymentStatus) {
      return false;
    }
    if (!q) return true;
    return (
      inv.number.toLowerCase().includes(q) ||
      inv.company.toLowerCase().includes(q) ||
      inv.category.toLowerCase().includes(q)
    );
  });

  return [...filtered].sort((a, b) => {
    switch (filters.sortKey) {
      case "number":
        return compareValues(a.number, b.number, filters.sortDir);
      case "company":
        return compareValues(a.company, b.company, filters.sortDir);
      case "amount":
        return compareValues(a.amount, b.amount, filters.sortDir);
      case "vat":
        return compareValues(a.vat, b.vat, filters.sortDir);
      case "status":
        return compareValues(a.status, b.status, filters.sortDir);
      case "dueDate":
        return compareValues(a.dueDate, b.dueDate, filters.sortDir);
      case "paymentStatus":
        return compareValues(a.paymentStatus, b.paymentStatus, filters.sortDir);
      case "category":
        return compareValues(a.category, b.category, filters.sortDir);
      case "aiConfidence":
        return compareValues(a.aiConfidence, b.aiConfidence, filters.sortDir);
      default:
        return 0;
    }
  });
}

/** Lightweight NL intent resolver for Smart Search prototypes. */
export function resolveSmartQuery(query: string): {
  readonly intent: string;
  readonly hint: string;
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { intent: "idle", hint: "Ask about invoices, expenses, VAT, or exports." };
  }
  if (q.includes("unpaid") || q.includes("open invoice")) {
    return { intent: "unpaid_invoices", hint: "Filtering Invoice Center to unpaid / open items." };
  }
  if (q.includes("july") && q.includes("expense")) {
    return { intent: "july_expenses", hint: "Showing July expense-side activity." };
  }
  if (q.includes("amazon")) {
    return { intent: "amazon", hint: "Locating Amazon invoices and receipts." };
  }
  if (q.includes("vat") || q.includes("export")) {
    return { intent: "vat_export", hint: "Opening DATEV / VAT export actions." };
  }
  return { intent: "general", hint: `Searching ledger for “${query.trim()}”.` };
}
