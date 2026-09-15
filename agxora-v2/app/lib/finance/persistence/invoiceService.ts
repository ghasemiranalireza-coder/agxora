import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import { assertFinance } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireFirstCustomerProductionReady } from "@/app/lib/production/requireReady";
import type {
  FinanceOverviewView,
  InvoiceListFilter,
  InvoiceStatus,
  InvoiceView,
} from "../core/types";
import { assertUuid, parseInvoiceStatus } from "../core/validation";
import { invoiceInclude, toInvoiceView, type InvoiceWithRelations } from "./mappers";

function financeReady(): void {
  requireFirstCustomerProductionReady();
}

function tenant(actor: Actor) {
  return { organizationId: actor.organizationId, workspaceId: actor.workspaceId };
}

function effectiveStatus(row: { status: InvoiceStatus; dueDate: Date }): InvoiceStatus {
  if (row.status === "OPEN" && row.dueDate.getTime() < Date.now()) {
    return "OVERDUE";
  }
  return row.status;
}

export async function listInvoicesForActor(
  actor: Actor,
  filter: InvoiceListFilter = {},
): Promise<readonly InvoiceView[]> {
  financeReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const where: Prisma.InvoiceWhereInput = {
    workspaceId: actor.workspaceId,
    organizationId: actor.organizationId,
  };
  if (filter.customerId) {
    where.customerId = assertUuid(filter.customerId, "customerId");
  }
  if (filter.status && filter.status !== "all") {
    if (filter.status === "OVERDUE") {
      where.status = "OPEN";
      where.dueDate = { lt: new Date() };
    } else {
      where.status = filter.status;
    }
  }
  if (filter.query?.trim()) {
    const q = filter.query.trim();
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { customerCompanyName: { contains: q, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.invoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => {
    const view = toInvoiceView(row as InvoiceWithRelations);
    return { ...view, status: effectiveStatus(row) };
  });
}

export async function getInvoiceForActor(actor: Actor, id: string): Promise<InvoiceView> {
  financeReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const row = await prisma.invoice.findFirst({
    where: {
      id: assertUuid(id, "id"),
      workspaceId: actor.workspaceId,
      organizationId: actor.organizationId,
    },
    include: invoiceInclude,
  });
  if (!row) {
    throw new PersistenceError("not_found", "Invoice not found");
  }
  const view = toInvoiceView(row as InvoiceWithRelations);
  return { ...view, status: effectiveStatus(row) };
}

export async function updateInvoiceStatusForActor(
  actor: Actor,
  id: string,
  nextStatus: string,
): Promise<InvoiceView> {
  financeReady();
  const status = parseInvoiceStatus(nextStatus);
  if (!status) {
    throw new PersistenceError("validation", "Invalid invoice status");
  }
  const existing = await prisma.invoice.findFirst({
    where: {
      id: assertUuid(id, "id"),
      workspaceId: actor.workspaceId,
      organizationId: actor.organizationId,
    },
    select: { id: true, status: true, organizationId: true, workspaceId: true, invoiceNumber: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Invoice not found");
  }
  assertFinance(actor, "finance.status", {
    organizationId: existing.organizationId,
    workspaceId: existing.workspaceId,
  });
  if (existing.status === "CANCELLED" && status !== "CANCELLED") {
    throw new PersistenceError("conflict", "Cancelled invoices cannot change status");
  }
  if (existing.status === "PAID" && status === "DRAFT") {
    throw new PersistenceError("conflict", "Paid invoices cannot return to draft");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.invoice.update({
      where: { id: existing.id },
      data: { status },
      include: invoiceInclude,
    });
    await tx.controlPlaneAuditEvent.create({
      data: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        actorUserId: actor.userId,
        action: "invoice_status_changed",
        metadata: {
          invoiceId: row.id,
          invoiceNumber: row.invoiceNumber,
          from: existing.status,
          to: status,
        },
      },
    });
    return row;
  });

  const view = toInvoiceView(updated as InvoiceWithRelations);
  return { ...view, status: effectiveStatus(updated) };
}

export async function getFinanceOverviewForActor(actor: Actor): Promise<FinanceOverviewView> {
  financeReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const scope = {
    workspaceId: actor.workspaceId,
    organizationId: actor.organizationId,
  };
  const now = new Date();
  const [
    openDeliveryNotes,
    unbilledDeliveryNotes,
    openInvoices,
    overdueInvoices,
    draftInvoices,
    totalDeliveryNotes,
    totalInvoices,
  ] = await Promise.all([
    prisma.deliveryNote.count({ where: { ...scope, status: "OPEN" } }),
    prisma.deliveryNote.count({ where: { ...scope, status: "OPEN" } }),
    prisma.invoice.count({ where: { ...scope, status: "OPEN" } }),
    prisma.invoice.count({
      where: { ...scope, status: "OPEN", dueDate: { lt: now } },
    }),
    prisma.invoice.count({ where: { ...scope, status: "DRAFT" } }),
    prisma.deliveryNote.count({ where: scope }),
    prisma.invoice.count({ where: scope }),
  ]);
  return {
    openDeliveryNotes,
    unbilledDeliveryNotes,
    openInvoices,
    overdueInvoices,
    draftInvoices,
    totalDeliveryNotes,
    totalInvoices,
    currency: "EUR",
  };
}
