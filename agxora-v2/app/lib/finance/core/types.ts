/**
 * Business finance contracts — Lieferschein / Rechnung.
 * Amounts are decimal strings so clients never persist IEEE floats.
 */

export type DeliveryNoteStatus = "DRAFT" | "OPEN" | "ABGERECHNET" | "CANCELLED";
export type InvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "OVERDUE" | "CANCELLED";

export type FinanceLineDraft = {
  readonly description: string;
  readonly quantity: string;
  readonly unit?: string;
  readonly unitPriceNet: string;
  readonly taxRate?: string;
};

export type FinanceLineView = {
  readonly id: string;
  readonly position: number;
  readonly description: string;
  readonly quantity: string;
  readonly unit: string;
  readonly unitPriceNet: string;
  readonly taxRate: string;
  readonly lineTotalNet: string;
  readonly taxTotal: string;
  readonly lineTotalGross: string;
  readonly deliveryNoteId?: string | null;
  readonly deliveryNoteNumber?: string;
};

export type DeliveryNoteDraft = {
  readonly customerId: string;
  readonly date?: string;
  readonly orderNumber?: string;
  readonly status?: DeliveryNoteStatus;
  readonly notes?: string;
  readonly items: readonly FinanceLineDraft[];
};

export type DeliveryNoteView = {
  readonly id: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly customerId: string;
  readonly customerCompanyName: string;
  readonly number: string;
  readonly date: string;
  readonly orderNumber: string;
  readonly status: DeliveryNoteStatus;
  readonly notes: string;
  readonly currency: string;
  readonly netTotal: string;
  readonly taxTotal: string;
  readonly grossTotal: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items: readonly FinanceLineView[];
  readonly invoiceId: string | null;
  readonly invoiceNumber: string | null;
};

export type InvoiceView = {
  readonly id: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly customerId: string;
  readonly customerCompanyName: string;
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly status: InvoiceStatus;
  readonly notes: string;
  readonly currency: string;
  readonly netTotal: string;
  readonly taxTotal: string;
  readonly grossTotal: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items: readonly FinanceLineView[];
  readonly sourceDeliveryNotes: readonly {
    readonly id: string;
    readonly number: string;
    readonly date: string;
    readonly netTotal: string;
  }[];
};

export type FinanceOverviewView = {
  readonly openDeliveryNotes: number;
  readonly unbilledDeliveryNotes: number;
  readonly openInvoices: number;
  readonly overdueInvoices: number;
  readonly draftInvoices: number;
  readonly totalDeliveryNotes: number;
  readonly totalInvoices: number;
  readonly currency: string;
};

export type BillingPreviewView = {
  readonly customerId: string;
  readonly customerCompanyName: string;
  readonly deliveryNoteCount: number;
  readonly deliveryNotes: readonly {
    readonly id: string;
    readonly number: string;
    readonly date: string;
    readonly netTotal: string;
    readonly taxTotal: string;
    readonly grossTotal: string;
  }[];
  readonly netTotal: string;
  readonly taxTotal: string;
  readonly grossTotal: string;
  readonly currency: string;
};

export type DeliveryNoteListFilter = {
  readonly customerId?: string;
  readonly status?: DeliveryNoteStatus | "all";
  readonly query?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
};

export type InvoiceListFilter = {
  readonly customerId?: string;
  readonly status?: InvoiceStatus | "all";
  readonly query?: string;
};

export type BillDeliveryNotesInput = {
  readonly deliveryNoteIds?: readonly string[];
  readonly customerId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly mode?: "selected" | "all_open" | "date_range";
  readonly notes?: string;
  readonly dueDate?: string;
  readonly invoiceDate?: string;
  readonly idempotencyKey?: string;
};
