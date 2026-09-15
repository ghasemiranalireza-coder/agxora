import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import { assertFinance } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireFirstCustomerProductionReady } from "@/app/lib/production/requireReady";
import { moneyString, totalsFromLines } from "../money";
import type {
  BillDeliveryNotesInput,
  BillingPreviewView,
  DeliveryNoteDraft,
  DeliveryNoteListFilter,
  DeliveryNoteView,
  InvoiceView,
} from "../core/types";
import {
  assertUuid,
  parseIdempotencyKey,
  parseIsoDate,
  uniqueSortedIds,
  validateDeliveryNoteDraft,
} from "../core/validation";
import {
  deliveryNoteInclude,
  invoiceInclude,
  toDeliveryNoteView,
  toInvoiceView,
  type DeliveryNoteWithRelations,
  type InvoiceWithRelations,
} from "./mappers";
import { nextDocumentNumber } from "./sequence";
import { captureDocumentSnapshot } from "../documents/snapshot";

function financeReady(): void {
  requireFirstCustomerProductionReady();
}

function tenant(actor: Actor) {
  return { organizationId: actor.organizationId, workspaceId: actor.workspaceId };
}

async function loadCustomer(actor: Actor, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId: actor.workspaceId, organizationId: actor.organizationId },
    select: {
      id: true,
      companyName: true,
      address: true,
      city: true,
      country: true,
      taxNumber: true,
      organizationId: true,
      workspaceId: true,
    },
  });
  if (!customer) {
    throw new PersistenceError("not_found", "Customer not found");
  }
  return customer;
}

function requestHash(ids: readonly string[]): string {
  return createHash("sha256").update(ids.join(",")).digest("hex");
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function yearOf(date: Date): number {
  return date.getUTCFullYear();
}

async function audit(
  tx: Prisma.TransactionClient,
  actor: Actor,
  action: string,
  metadata: Record<string, string | number | boolean | null>,
): Promise<void> {
  await tx.controlPlaneAuditEvent.create({
    data: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      actorUserId: actor.userId,
      action,
      metadata,
    },
  });
}

export async function listDeliveryNotesForActor(
  actor: Actor,
  filter: DeliveryNoteListFilter = {},
): Promise<readonly DeliveryNoteView[]> {
  financeReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const where: Prisma.DeliveryNoteWhereInput = {
    workspaceId: actor.workspaceId,
    organizationId: actor.organizationId,
  };
  if (filter.customerId) {
    where.customerId = assertUuid(filter.customerId, "customerId");
  }
  if (filter.status && filter.status !== "all") {
    where.status = filter.status;
  }
  if (filter.query?.trim()) {
    const q = filter.query.trim();
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerCompanyName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter.dateFrom || filter.dateTo) {
    where.date = {};
    if (filter.dateFrom) where.date.gte = parseIsoDate(filter.dateFrom, "dateFrom");
    if (filter.dateTo) where.date.lte = parseIsoDate(filter.dateTo, "dateTo");
  }
  const rows = await prisma.deliveryNote.findMany({
    where,
    include: deliveryNoteInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => toDeliveryNoteView(row as DeliveryNoteWithRelations));
}

export async function getDeliveryNoteForActor(
  actor: Actor,
  id: string,
): Promise<DeliveryNoteView> {
  financeReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const row = await prisma.deliveryNote.findFirst({
    where: {
      id: assertUuid(id, "id"),
      workspaceId: actor.workspaceId,
      organizationId: actor.organizationId,
    },
    include: deliveryNoteInclude,
  });
  if (!row) {
    throw new PersistenceError("not_found", "Delivery note not found");
  }
  return toDeliveryNoteView(row as DeliveryNoteWithRelations);
}

export async function createDeliveryNoteForActor(
  actor: Actor,
  draft: DeliveryNoteDraft,
): Promise<DeliveryNoteView> {
  financeReady();
  assertFinance(actor, "finance.write", tenant(actor));
  const validated = validateDeliveryNoteDraft(draft);
  const customer = await loadCustomer(actor, validated.customerId);
  const computed = totalsFromLines(
    validated.items.map((item) => ({
      quantity: item.quantity,
      unitPriceNet: item.unitPriceNet,
      taxRate: item.taxRate ?? "19.00",
    })),
  );

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      kind: "DELIVERY_NOTE",
      year: yearOf(validated.date),
    });
    const snapshot = await captureDocumentSnapshot(
      actor,
      "DELIVERY_NOTE",
      {
        companyName: customer.companyName,
        address: customer.address,
        city: customer.city,
        country: customer.country,
        taxNumber: customer.taxNumber,
      },
      tx,
    );
    const row = await tx.deliveryNote.create({
      data: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        customerId: customer.id,
        customerCompanyName: customer.companyName,
        number,
        date: validated.date,
        orderNumber: validated.orderNumber,
        status: validated.status,
        notes: validated.notes,
        currency: "EUR",
        netTotal: computed.totals.netTotal,
        taxTotal: computed.totals.taxTotal,
        grossTotal: computed.totals.grossTotal,
        createdByUserId: actor.userId,
        documentSnapshot: snapshot as Prisma.InputJsonValue,
        items: {
          create: computed.lines.map((line, index) => ({
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            position: index + 1,
            description: validated.items[index].description,
            quantity: line.quantity,
            unit: validated.items[index].unit ?? "Stk",
            unitPriceNet: line.unitPriceNet,
            taxRate: line.taxRate,
            lineTotalNet: line.lineTotalNet,
            taxTotal: line.taxTotal,
            lineTotalGross: line.lineTotalGross,
          })),
        },
      },
      include: deliveryNoteInclude,
    });
    await audit(tx, actor, "lieferschein_created", {
      deliveryNoteId: row.id,
      number: row.number,
      customerId: customer.id,
    });
    return row;
  });

  return toDeliveryNoteView(created as DeliveryNoteWithRelations);
}

export async function updateDeliveryNoteForActor(
  actor: Actor,
  id: string,
  draft: DeliveryNoteDraft,
): Promise<DeliveryNoteView> {
  financeReady();
  const existing = await prisma.deliveryNote.findFirst({
    where: {
      id: assertUuid(id, "id"),
      workspaceId: actor.workspaceId,
      organizationId: actor.organizationId,
    },
    select: { id: true, status: true, organizationId: true, workspaceId: true, number: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Delivery note not found");
  }
  assertFinance(actor, "finance.write", {
    organizationId: existing.organizationId,
    workspaceId: existing.workspaceId,
  });
  if (existing.status === "ABGERECHNET" || existing.status === "CANCELLED") {
    throw new PersistenceError("conflict", "Billed or cancelled delivery notes cannot be edited");
  }
  const validated = validateDeliveryNoteDraft(draft);
  if (validated.status === "ABGERECHNET") {
    throw new PersistenceError("validation", "Use billing to mark a delivery note as billed");
  }
  const customer = await loadCustomer(actor, validated.customerId);
  const computed = totalsFromLines(
    validated.items.map((item) => ({
      quantity: item.quantity,
      unitPriceNet: item.unitPriceNet,
      taxRate: item.taxRate ?? "19.00",
    })),
  );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: existing.id } });
    const snapshot = await captureDocumentSnapshot(
      actor,
      "DELIVERY_NOTE",
      {
        companyName: customer.companyName,
        address: customer.address,
        city: customer.city,
        country: customer.country,
        taxNumber: customer.taxNumber,
      },
      tx,
    );
    const row = await tx.deliveryNote.update({
      where: { id: existing.id },
      data: {
        customerId: customer.id,
        customerCompanyName: customer.companyName,
        date: validated.date,
        orderNumber: validated.orderNumber,
        status: validated.status,
        notes: validated.notes,
        netTotal: computed.totals.netTotal,
        taxTotal: computed.totals.taxTotal,
        grossTotal: computed.totals.grossTotal,
        documentSnapshot: snapshot as Prisma.InputJsonValue,
        items: {
          create: computed.lines.map((line, index) => ({
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            position: index + 1,
            description: validated.items[index].description,
            quantity: line.quantity,
            unit: validated.items[index].unit ?? "Stk",
            unitPriceNet: line.unitPriceNet,
            taxRate: line.taxRate,
            lineTotalNet: line.lineTotalNet,
            taxTotal: line.taxTotal,
            lineTotalGross: line.lineTotalGross,
          })),
        },
      },
      include: deliveryNoteInclude,
    });
    await audit(tx, actor, "lieferschein_updated", {
      deliveryNoteId: row.id,
      number: row.number,
    });
    return row;
  });

  return toDeliveryNoteView(updated as DeliveryNoteWithRelations);
}

async function resolveBillableIds(
  actor: Actor,
  input: BillDeliveryNotesInput,
): Promise<string[]> {
  const mode = input.mode ?? "selected";
  if (mode === "selected") {
    if (!input.deliveryNoteIds?.length) {
      throw new PersistenceError("validation", "Select at least one delivery note");
    }
    return uniqueSortedIds(input.deliveryNoteIds);
  }

  const where: Prisma.DeliveryNoteWhereInput = {
    workspaceId: actor.workspaceId,
    organizationId: actor.organizationId,
    status: "OPEN",
  };
  if (input.customerId) {
    where.customerId = assertUuid(input.customerId, "customerId");
  }
  if (mode === "date_range") {
    if (!input.dateFrom && !input.dateTo) {
      throw new PersistenceError("validation", "A date range is required");
    }
    where.date = {};
    if (input.dateFrom) where.date.gte = parseIsoDate(input.dateFrom, "dateFrom");
    if (input.dateTo) where.date.lte = parseIsoDate(input.dateTo, "dateTo");
  }
  if (mode === "all_open" && !input.customerId) {
    throw new PersistenceError(
      "validation",
      "All-open billing requires a customer so invoices are not mixed",
    );
  }

  const rows = await prisma.deliveryNote.findMany({
    where,
    select: { id: true },
    orderBy: { number: "asc" },
  });
  if (rows.length === 0) {
    throw new PersistenceError("validation", "No eligible open delivery notes match the selection");
  }
  return rows.map((row) => row.id);
}

function toPreview(rows: DeliveryNoteWithRelations[]): BillingPreviewView {
  if (rows.length === 0) {
    throw new PersistenceError("validation", "No eligible open delivery notes match the selection");
  }
  const customerIds = new Set(rows.map((row) => row.customerId));
  if (customerIds.size !== 1) {
    throw new PersistenceError(
      "validation",
      "All delivery notes in one invoice must belong to the same customer",
    );
  }
  const first = rows[0];
  const net = rows.reduce((sum, row) => sum.add(row.netTotal), new Prisma.Decimal(0));
  const tax = rows.reduce((sum, row) => sum.add(row.taxTotal), new Prisma.Decimal(0));
  const gross = rows.reduce((sum, row) => sum.add(row.grossTotal), new Prisma.Decimal(0));
  return {
    customerId: first.customerId,
    customerCompanyName: first.customerCompanyName,
    deliveryNoteCount: rows.length,
    deliveryNotes: rows.map((row) => ({
      id: row.id,
      number: row.number,
      date: row.date.toISOString().slice(0, 10),
      netTotal: moneyString(row.netTotal),
      taxTotal: moneyString(row.taxTotal),
      grossTotal: moneyString(row.grossTotal),
    })),
    netTotal: moneyString(net),
    taxTotal: moneyString(tax),
    grossTotal: moneyString(gross),
    currency: first.currency,
  };
}

export async function previewBillingForActor(
  actor: Actor,
  input: BillDeliveryNotesInput,
): Promise<BillingPreviewView> {
  financeReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const ids = await resolveBillableIds(actor, input);
  const rows = await prisma.deliveryNote.findMany({
    where: {
      id: { in: ids },
      workspaceId: actor.workspaceId,
      organizationId: actor.organizationId,
    },
    include: deliveryNoteInclude,
    orderBy: { number: "asc" },
  });
  if (rows.length !== ids.length) {
    throw new PersistenceError("not_found", "One or more delivery notes were not found");
  }
  const ineligible = rows.filter((row) => row.status !== "OPEN");
  if (ineligible.length > 0) {
    throw new PersistenceError(
      "conflict",
      "Only open delivery notes can be billed",
    );
  }
  return toPreview(rows as DeliveryNoteWithRelations[]);
}

async function loadLockedNotes(
  tx: Prisma.TransactionClient,
  actor: Actor,
  ids: readonly string[],
): Promise<DeliveryNoteWithRelations[]> {
  await tx.$queryRaw(
    Prisma.sql`
      SELECT id FROM delivery_notes
      WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
        AND "workspaceId" = ${actor.workspaceId}::uuid
        AND "organizationId" = ${actor.organizationId}::uuid
      FOR UPDATE
    `,
  );
  const rows = await tx.deliveryNote.findMany({
    where: {
      id: { in: [...ids] },
      workspaceId: actor.workspaceId,
      organizationId: actor.organizationId,
    },
    include: deliveryNoteInclude,
    orderBy: { number: "asc" },
  });
  return rows as DeliveryNoteWithRelations[];
}

export async function billDeliveryNotesForActor(
  actor: Actor,
  input: BillDeliveryNotesInput,
): Promise<{ readonly invoice: InvoiceView; readonly idempotentReplay: boolean }> {
  financeReady();
  assertFinance(actor, "finance.bill", tenant(actor));
  const ids = await resolveBillableIds(actor, input);
  const hash = requestHash(ids);
  const idempotencyKey = parseIdempotencyKey(input.idempotencyKey) ?? `bill:${hash}`;
  const invoiceDate = parseIsoDate(input.invoiceDate, "invoiceDate", new Date());
  const dueDate = parseIsoDate(input.dueDate, "dueDate", addDays(invoiceDate, 14));
  const notes = (input.notes ?? "").trim();

  try {
    const result = await prisma.$transaction(async (tx) => {
      let keyRow = await tx.financeIdempotencyKey.findUnique({
        where: {
          workspaceId_idempotencyKey: {
            workspaceId: actor.workspaceId,
            idempotencyKey,
          },
        },
      });

      if (!keyRow) {
        try {
          keyRow = await tx.financeIdempotencyKey.create({
            data: {
              organizationId: actor.organizationId,
              workspaceId: actor.workspaceId,
              idempotencyKey,
              requestHash: hash,
              status: "IN_PROGRESS",
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            keyRow = await tx.financeIdempotencyKey.findUnique({
              where: {
                workspaceId_idempotencyKey: {
                  workspaceId: actor.workspaceId,
                  idempotencyKey,
                },
              },
            });
          } else {
            throw error;
          }
        }
      }

      if (!keyRow) {
        throw new PersistenceError("persistence", "Failed to acquire billing lock");
      }

      if (keyRow.organizationId !== actor.organizationId) {
        throw new PersistenceError("forbidden", "Tenant boundary violation");
      }

      if (keyRow.status === "COMPLETED" && keyRow.invoiceId) {
        if (keyRow.requestHash !== hash) {
          throw new PersistenceError(
            "conflict",
            "Idempotency key was already used for a different billing request",
          );
        }
        const existing = await tx.invoice.findFirst({
          where: {
            id: keyRow.invoiceId,
            workspaceId: actor.workspaceId,
            organizationId: actor.organizationId,
          },
          include: invoiceInclude,
        });
        if (!existing) {
          throw new PersistenceError("persistence", "Idempotent invoice is missing");
        }
        return {
          invoice: existing as InvoiceWithRelations,
          idempotentReplay: true,
        };
      }

      if (keyRow.requestHash !== hash) {
        throw new PersistenceError(
          "conflict",
          "Idempotency key was already used for a different billing request",
        );
      }

      const locked = await loadLockedNotes(tx, actor, ids);
      if (locked.length !== ids.length) {
        throw new PersistenceError("not_found", "One or more delivery notes were not found");
      }
      const wrongTenant = locked.find(
        (row) =>
          row.workspaceId !== actor.workspaceId ||
          row.organizationId !== actor.organizationId,
      );
      if (wrongTenant) {
        throw new PersistenceError("forbidden", "Tenant boundary violation");
      }
      const notOpen = locked.filter((row) => row.status !== "OPEN");
      if (notOpen.length > 0) {
        throw new PersistenceError("conflict", "A selected delivery note is not eligible for billing");
      }
      const customerIds = new Set(locked.map((row) => row.customerId));
      if (customerIds.size !== 1) {
        throw new PersistenceError(
          "validation",
          "All delivery notes in one invoice must belong to the same customer",
        );
      }

      const invoiceItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = [];
      locked.forEach((note) => {
        [...note.items]
          .sort((a, b) => a.position - b.position)
          .forEach((item) => {
            invoiceItems.push({
              organizationId: actor.organizationId,
              workspaceId: actor.workspaceId,
              deliveryNoteId: note.id,
              deliveryNoteNumber: note.number,
              position: invoiceItems.length + 1,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPriceNet: item.unitPriceNet,
              taxRate: item.taxRate,
              lineTotalNet: item.lineTotalNet,
              taxTotal: item.taxTotal,
              lineTotalGross: item.lineTotalGross,
            });
          });
      });
      if (invoiceItems.length === 0) {
        throw new PersistenceError("validation", "Selected delivery notes have no line items");
      }

      const netTotal = locked.reduce((sum, row) => sum.add(row.netTotal), new Prisma.Decimal(0));
      const taxTotal = locked.reduce((sum, row) => sum.add(row.taxTotal), new Prisma.Decimal(0));
      const grossTotal = locked.reduce((sum, row) => sum.add(row.grossTotal), new Prisma.Decimal(0));
      const first = locked[0];
      const customerRow = await tx.customer.findFirst({
        where: {
          id: first.customerId,
          workspaceId: actor.workspaceId,
          organizationId: actor.organizationId,
        },
        select: { companyName: true, address: true, city: true, country: true, taxNumber: true },
      });
      const invoiceSnapshot = await captureDocumentSnapshot(
        actor,
        "INVOICE",
        {
          companyName: first.customerCompanyName,
          address: customerRow?.address ?? "",
          city: customerRow?.city ?? "",
          country: customerRow?.country ?? "",
          taxNumber: customerRow?.taxNumber ?? "",
        },
        tx,
      );
      const invoiceNumber = await nextDocumentNumber(tx, {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        kind: "INVOICE",
        year: yearOf(invoiceDate),
      });

      const invoice = await tx.invoice.create({
        data: {
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          customerId: first.customerId,
          customerCompanyName: first.customerCompanyName,
          invoiceNumber,
          invoiceDate,
          dueDate,
          status: "DRAFT",
          notes,
          currency: first.currency,
          netTotal,
          taxTotal,
          grossTotal,
          createdByUserId: actor.userId,
          documentSnapshot: invoiceSnapshot as Prisma.InputJsonValue,
          items: { create: invoiceItems },
          deliveryNotes: {
            create: locked.map((note) => ({
              organizationId: actor.organizationId,
              workspaceId: actor.workspaceId,
              deliveryNoteId: note.id,
            })),
          },
        },
        include: invoiceInclude,
      });

      const marked = await tx.deliveryNote.updateMany({
        where: {
          id: { in: ids },
          workspaceId: actor.workspaceId,
          organizationId: actor.organizationId,
          status: "OPEN",
        },
        data: { status: "ABGERECHNET" },
      });
      if (marked.count !== ids.length) {
        throw new PersistenceError(
          "conflict",
          "Billing aborted because a delivery note was no longer open",
        );
      }

      await tx.financeIdempotencyKey.update({
        where: { id: keyRow.id },
        data: {
          status: "COMPLETED",
          invoiceId: invoice.id,
          requestHash: hash,
        },
      });

      await audit(tx, actor, "lieferscheine_billed", {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        deliveryNoteCount: ids.length,
      });
      await audit(tx, actor, "invoice_draft_created", {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      });

      return {
        invoice: invoice as InvoiceWithRelations,
        idempotentReplay: false,
      };
    });

    return {
      invoice: toInvoiceView(result.invoice),
      idempotentReplay: result.idempotentReplay,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PersistenceError(
        "conflict",
        "A selected delivery note has already been billed",
      );
    }
    throw error;
  }
}

export async function createInvoiceDraftForActor(
  actor: Actor,
  input: BillDeliveryNotesInput,
): Promise<InvoiceView> {
  const billed = await billDeliveryNotesForActor(actor, input);
  return billed.invoice;
}
