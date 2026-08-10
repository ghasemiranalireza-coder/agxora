import type {
  InvoiceCategory,
  InvoiceStatus,
  PaymentStatus,
  ProcessingStageStatus,
  ExportStatus,
  InsightSeverity,
} from "./types";

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number, currency = "EUR"): string {
  if (currency === "EUR") return EUR.format(amount);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    draft: "Draft",
    open: "Open",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return map[status];
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    refunded: "Refunded",
  };
  return map[status];
}

export function categoryLabel(category: InvoiceCategory): string {
  const map: Record<InvoiceCategory, string> = {
    saas: "SaaS",
    office: "Office",
    travel: "Travel",
    marketing: "Marketing",
    utilities: "Utilities",
    professional: "Professional",
    other: "Other",
  };
  return map[category];
}

export function stageLabel(status: ProcessingStageStatus): string {
  const map: Record<ProcessingStageStatus, string> = {
    pending: "Unavailable",
    running: "Not connected",
    complete: "Demo",
    failed: "Failed",
    skipped: "Skipped",
  };
  return map[status];
}

export function exportStatusLabel(status: ExportStatus): string {
  const map: Record<ExportStatus, string> = {
    queued: "Sample · Queued",
    ready: "Sample · Ready",
    delivered: "Illustrative",
    failed: "Failed",
  };
  return map[status];
}

export function severityTone(severity: InsightSeverity): {
  border: string;
  background: string;
  color: string;
} {
  switch (severity) {
    case "critical":
      return {
        border: "rgba(251,113,133,0.35)",
        background: "rgba(251,113,133,0.12)",
        color: "#fb7185",
      };
    case "warning":
      return {
        border: "rgba(251,191,36,0.35)",
        background: "rgba(251,191,36,0.12)",
        color: "#fbbf24",
      };
    case "opportunity":
      return {
        border: "rgba(52,211,153,0.35)",
        background: "rgba(52,211,153,0.12)",
        color: "#34d399",
      };
    default:
      return {
        border: "rgba(34,211,238,0.35)",
        background: "rgba(34,211,238,0.12)",
        color: "#22d3ee",
      };
  }
}
