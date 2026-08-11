/**
 * Finance display formatters — delegate to shared i18n Intl helpers.
 * Locale follows the active UI locale; currency stays an explicit ISO code.
 * Label helpers return finance.* i18n keys for t() at render time.
 */

import {
  formatCurrency,
  formatDate as formatSharedDate,
  formatPercent as formatSharedPercent,
  resolveDisplayCurrency,
} from "../i18n/format";
import type {
  InvoiceCategory,
  InvoiceStatus,
  PaymentStatus,
  ProcessingStageStatus,
  ExportStatus,
  InsightSeverity,
} from "./types";

export function formatMoney(amount: number, currency?: string): string {
  return formatCurrency(amount, undefined, resolveDisplayCurrency(currency));
}

export function formatPercent(value: number): string {
  return formatSharedPercent(value);
}

export function formatDate(iso: string): string {
  return formatSharedDate(iso, undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return `finance.status.${status}`;
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return `finance.payment.${status}`;
}

export function categoryLabel(category: InvoiceCategory): string {
  return `finance.category.${category}`;
}

export function stageLabel(status: ProcessingStageStatus): string {
  return `finance.stage.${status}`;
}

export function exportStatusLabel(status: ExportStatus): string {
  return `finance.exportStatus.${status}`;
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
