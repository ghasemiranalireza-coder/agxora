/**
 * AGXORA Finance & Tax — domain types.
 * Foundation for OCR, Bank APIs, DATEV, AI Accounting, and Tax Engine.
 */

export type InvoiceStatus = "draft" | "open" | "paid" | "overdue" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type InvoiceCategory =
  | "saas"
  | "office"
  | "travel"
  | "marketing"
  | "utilities"
  | "professional"
  | "other";

export type ProcessingStageStatus = "pending" | "running" | "complete" | "failed" | "skipped";

export type InsightSeverity = "info" | "warning" | "critical" | "opportunity";
export type InsightKind =
  | "unusual_expense"
  | "duplicate_invoice"
  | "missing_invoice"
  | "late_payment"
  | "cashflow_prediction"
  | "tax_optimization";

export type ExportFormat = "datev" | "csv" | "pdf" | "xml";
export type ExportStatus = "queued" | "ready" | "delivered" | "failed";

export type VatPeriod = "monthly" | "quarterly";

export interface MoneyAmount {
  readonly amount: number;
  readonly currency: string;
}

export interface FinanceOverviewMetric {
  readonly id: string;
  readonly label: string;
  /**
   * Display value: raw number (format at render) or ready-made string
   * (counts / scores that are not locale money).
   */
  readonly value: string | number;
  /** ISO 4217 when `value` is a money amount. Defaults via resolveDisplayCurrency. */
  readonly currency?: string;
  readonly caption: string;
  /** When set, `{money}` in caption is replaced with formatMoney at render. */
  readonly captionAmount?: number;
  readonly delta?: { readonly value: string; readonly positive: boolean };
  readonly tone?: "default" | "positive" | "warning" | "accent";
}

export interface FinanceInvoice {
  readonly id: string;
  readonly number: string;
  readonly company: string;
  readonly amount: number;
  readonly vat: number;
  readonly currency: string;
  readonly status: InvoiceStatus;
  readonly dueDate: string;
  readonly paymentStatus: PaymentStatus;
  readonly category: InvoiceCategory;
  readonly aiConfidence: number;
}

export interface UploadJob {
  readonly id: string;
  readonly fileName: string;
  readonly source: "pdf" | "image" | "email";
  readonly ocr: ProcessingStageStatus;
  readonly extraction: ProcessingStageStatus;
  readonly categorization: ProcessingStageStatus;
  readonly duplicateDetection: ProcessingStageStatus;
  readonly uploadedAt: string;
}

export interface BankAccount {
  readonly id: string;
  readonly bankName: string;
  readonly ibanMasked: string;
  readonly balance: number;
  readonly currency: string;
  readonly connected: boolean;
  readonly lastSync: string;
}

export interface BankTransaction {
  readonly id: string;
  readonly accountId: string;
  readonly date: string;
  readonly counterparty: string;
  readonly amount: number;
  readonly currency: string;
  readonly matched: boolean;
  readonly invoiceRef?: string;
}

export interface DatevExportRecord {
  readonly id: string;
  readonly format: ExportFormat;
  readonly label: string;
  readonly createdAt: string;
  readonly status: ExportStatus;
  readonly period: string;
  readonly steuerberaterReady: boolean;
}

export interface TaxDeadline {
  readonly id: string;
  readonly label: string;
  readonly dueDate: string;
  readonly amount: number;
  readonly currency: string;
  readonly period: VatPeriod | "annual";
  readonly status: "upcoming" | "due_soon" | "overdue" | "paid";
}

export interface VatSummary {
  readonly periodLabel: string;
  readonly periodType: VatPeriod;
  readonly collected: number;
  readonly deductible: number;
  readonly netDue: number;
  readonly currency: string;
}

export interface AiInsight {
  readonly id: string;
  readonly kind: InsightKind;
  readonly title: string;
  readonly description: string;
  readonly severity: InsightSeverity;
  readonly detectedAt: string;
  readonly actionLabel?: string;
}

export interface SmartSearchExample {
  readonly id: string;
  readonly query: string;
  readonly description: string;
}

export type InvoiceSortKey =
  | "number"
  | "company"
  | "amount"
  | "vat"
  | "status"
  | "dueDate"
  | "paymentStatus"
  | "category"
  | "aiConfidence";

export type SortDirection = "asc" | "desc";
