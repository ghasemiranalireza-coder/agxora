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

/** Lightweight NL intent resolver for Smart Search prototypes. Hints are i18n keys. */
export function resolveSmartQuery(query: string): {
  readonly intent: string;
  readonly hintKey: string;
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { intent: "idle", hintKey: "finance.search.hints.idle" };
  }
  if (
    q.includes("unpaid") ||
    q.includes("open invoice") ||
    q.includes("offen") ||
    q.includes("unbezahlt") ||
    q.includes("پرداخت‌نشده") ||
    q.includes("پرداخت نشده") ||
    q.includes("فاکتورهای باز") ||
    q.includes("فاکتورهای پرداخت")
  ) {
    return {
      intent: "unpaid_invoices",
      hintKey: "finance.search.hints.unpaid_invoices",
    };
  }
  if (
    (q.includes("july") || q.includes("juli") || q.includes("ژوئیه") || q.includes("جولای")) &&
    (q.includes("expense") || q.includes("ausgabe") || q.includes("هزینه"))
  ) {
    return {
      intent: "july_expenses",
      hintKey: "finance.search.hints.july_expenses",
    };
  }
  if (q.includes("amazon")) {
    return { intent: "amazon", hintKey: "finance.search.hints.amazon" };
  }
  if (
    q.includes("vat") ||
    q.includes("export") ||
    q.includes("ust") ||
    q.includes("mwst") ||
    q.includes("datev") ||
    q.includes("مالیات") ||
    q.includes("خروجی")
  ) {
    return { intent: "vat_export", hintKey: "finance.search.hints.vat_export" };
  }
  return { intent: "general", hintKey: "finance.search.hints.general" };
}
