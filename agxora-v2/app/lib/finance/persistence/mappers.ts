import type {
  DeliveryNote,
  DeliveryNoteItem,
  Invoice,
  InvoiceDeliveryNote,
  InvoiceItem,
  Prisma,
} from "@prisma/client";
import { moneyString } from "../money";
import type {
  DeliveryNoteView,
  FinanceLineView,
  InvoiceView,
} from "../core/types";

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toLineView(
  row: DeliveryNoteItem | InvoiceItem,
  extra?: { readonly deliveryNoteId?: string | null; readonly deliveryNoteNumber?: string },
): FinanceLineView {
  const invoiceRow = row as InvoiceItem;
  return {
    id: row.id,
    position: row.position,
    description: row.description,
    quantity: moneyString(row.quantity, 4),
    unit: row.unit,
    unitPriceNet: moneyString(row.unitPriceNet, 4),
    taxRate: moneyString(row.taxRate, 2),
    lineTotalNet: moneyString(row.lineTotalNet),
    taxTotal: moneyString(row.taxTotal),
    lineTotalGross: moneyString(row.lineTotalGross),
    deliveryNoteId: extra?.deliveryNoteId ?? invoiceRow.deliveryNoteId ?? null,
    deliveryNoteNumber: extra?.deliveryNoteNumber ?? invoiceRow.deliveryNoteNumber ?? "",
  };
}

export type DeliveryNoteWithRelations = DeliveryNote & {
  readonly items: DeliveryNoteItem[];
  readonly invoiceLinks: (InvoiceDeliveryNote & { invoice?: { id: string; invoiceNumber: string } })[];
};

export function toDeliveryNoteView(row: DeliveryNoteWithRelations): DeliveryNoteView {
  const link = row.invoiceLinks[0];
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    customerId: row.customerId,
    customerCompanyName: row.customerCompanyName,
    number: row.number,
    date: isoDate(row.date),
    orderNumber: row.orderNumber,
    status: row.status,
    notes: row.notes,
    currency: row.currency,
    netTotal: moneyString(row.netTotal),
    taxTotal: moneyString(row.taxTotal),
    grossTotal: moneyString(row.grossTotal),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: [...row.items]
      .sort((a, b) => a.position - b.position)
      .map((item) => toLineView(item)),
    invoiceId: link?.invoice?.id ?? link?.invoiceId ?? null,
    invoiceNumber: link?.invoice?.invoiceNumber ?? null,
  };
}

export type InvoiceWithRelations = Invoice & {
  readonly items: InvoiceItem[];
  readonly deliveryNotes: (InvoiceDeliveryNote & {
    deliveryNote: Pick<DeliveryNote, "id" | "number" | "date" | "netTotal">;
  })[];
};

export function toInvoiceView(row: InvoiceWithRelations): InvoiceView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    customerId: row.customerId,
    customerCompanyName: row.customerCompanyName,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: isoDate(row.invoiceDate),
    dueDate: isoDate(row.dueDate),
    status: row.status,
    notes: row.notes,
    currency: row.currency,
    netTotal: moneyString(row.netTotal),
    taxTotal: moneyString(row.taxTotal),
    grossTotal: moneyString(row.grossTotal),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: [...row.items]
      .sort((a, b) => a.position - b.position)
      .map((item) => toLineView(item)),
    sourceDeliveryNotes: row.deliveryNotes.map((link) => ({
      id: link.deliveryNote.id,
      number: link.deliveryNote.number,
      date: isoDate(link.deliveryNote.date),
      netTotal: moneyString(link.deliveryNote.netTotal),
    })),
  };
}

export const deliveryNoteInclude = {
  items: { orderBy: { position: "asc" as const } },
  invoiceLinks: { include: { invoice: { select: { id: true, invoiceNumber: true } } } },
} satisfies Prisma.DeliveryNoteInclude;

export const invoiceInclude = {
  items: { orderBy: { position: "asc" as const } },
  deliveryNotes: {
    include: {
      deliveryNote: { select: { id: true, number: true, date: true, netTotal: true } },
    },
  },
} satisfies Prisma.InvoiceInclude;
