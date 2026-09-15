-- Phase 80: Lieferschein → Rechnung finance core (additive)

CREATE TYPE "DeliveryNoteStatus" AS ENUM ('DRAFT', 'OPEN', 'ABGERECHNET', 'CANCELLED');

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'OVERDUE', 'CANCELLED');

CREATE TYPE "FinanceDocumentKind" AS ENUM ('DELIVERY_NOTE', 'INVOICE');

CREATE TYPE "FinanceIdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

CREATE TABLE "delivery_notes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "customerCompanyName" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "orderNumber" TEXT NOT NULL DEFAULT '',
    "status" "DeliveryNoteStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "netTotal" DECIMAL(19,2) NOT NULL,
    "taxTotal" DECIMAL(19,2) NOT NULL,
    "grossTotal" DECIMAL(19,2) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_note_items" (
    "id" UUID NOT NULL,
    "deliveryNoteId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "unitPriceNet" DECIMAL(19,4) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotalNet" DECIMAL(19,2) NOT NULL,
    "taxTotal" DECIMAL(19,2) NOT NULL,
    "lineTotalGross" DECIMAL(19,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_note_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_invoices" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "customerCompanyName" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "netTotal" DECIMAL(19,2) NOT NULL,
    "taxTotal" DECIMAL(19,2) NOT NULL,
    "grossTotal" DECIMAL(19,2) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_invoice_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deliveryNoteId" UUID,
    "deliveryNoteNumber" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "unitPriceNet" DECIMAL(19,4) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotalNet" DECIMAL(19,2) NOT NULL,
    "taxTotal" DECIMAL(19,2) NOT NULL,
    "lineTotalGross" DECIMAL(19,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_delivery_notes" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "deliveryNoteId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_delivery_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_number_sequences" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "kind" "FinanceDocumentKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_number_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_idempotency_keys" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "FinanceIdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "invoiceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_notes_workspaceId_number_key" ON "delivery_notes"("workspaceId", "number");
CREATE INDEX "delivery_notes_organizationId_idx" ON "delivery_notes"("organizationId");
CREATE INDEX "delivery_notes_workspaceId_status_idx" ON "delivery_notes"("workspaceId", "status");
CREATE INDEX "delivery_notes_workspaceId_customerId_idx" ON "delivery_notes"("workspaceId", "customerId");
CREATE INDEX "delivery_notes_workspaceId_date_idx" ON "delivery_notes"("workspaceId", "date");
CREATE INDEX "delivery_notes_customerId_idx" ON "delivery_notes"("customerId");

CREATE INDEX "delivery_note_items_deliveryNoteId_idx" ON "delivery_note_items"("deliveryNoteId");
CREATE INDEX "delivery_note_items_workspaceId_idx" ON "delivery_note_items"("workspaceId");

CREATE UNIQUE INDEX "finance_invoices_workspaceId_invoiceNumber_key" ON "finance_invoices"("workspaceId", "invoiceNumber");
CREATE INDEX "finance_invoices_organizationId_idx" ON "finance_invoices"("organizationId");
CREATE INDEX "finance_invoices_workspaceId_status_idx" ON "finance_invoices"("workspaceId", "status");
CREATE INDEX "finance_invoices_workspaceId_customerId_idx" ON "finance_invoices"("workspaceId", "customerId");
CREATE INDEX "finance_invoices_workspaceId_invoiceDate_idx" ON "finance_invoices"("workspaceId", "invoiceDate");
CREATE INDEX "finance_invoices_workspaceId_dueDate_idx" ON "finance_invoices"("workspaceId", "dueDate");
CREATE INDEX "finance_invoices_customerId_idx" ON "finance_invoices"("customerId");

CREATE INDEX "finance_invoice_items_invoiceId_idx" ON "finance_invoice_items"("invoiceId");
CREATE INDEX "finance_invoice_items_workspaceId_idx" ON "finance_invoice_items"("workspaceId");
CREATE INDEX "finance_invoice_items_deliveryNoteId_idx" ON "finance_invoice_items"("deliveryNoteId");

CREATE UNIQUE INDEX "invoice_delivery_notes_deliveryNoteId_key" ON "invoice_delivery_notes"("deliveryNoteId");
CREATE UNIQUE INDEX "invoice_delivery_notes_invoiceId_deliveryNoteId_key" ON "invoice_delivery_notes"("invoiceId", "deliveryNoteId");
CREATE INDEX "invoice_delivery_notes_invoiceId_idx" ON "invoice_delivery_notes"("invoiceId");
CREATE INDEX "invoice_delivery_notes_workspaceId_idx" ON "invoice_delivery_notes"("workspaceId");

CREATE UNIQUE INDEX "finance_number_sequences_workspaceId_kind_year_key" ON "finance_number_sequences"("workspaceId", "kind", "year");
CREATE INDEX "finance_number_sequences_organizationId_idx" ON "finance_number_sequences"("organizationId");

CREATE UNIQUE INDEX "finance_idempotency_keys_workspaceId_idempotencyKey_key" ON "finance_idempotency_keys"("workspaceId", "idempotencyKey");
CREATE INDEX "finance_idempotency_keys_organizationId_idx" ON "finance_idempotency_keys"("organizationId");
CREATE INDEX "finance_idempotency_keys_invoiceId_idx" ON "finance_idempotency_keys"("invoiceId");

ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_note_items" ADD CONSTRAINT "delivery_note_items_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "delivery_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finance_invoice_items" ADD CONSTRAINT "finance_invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_delivery_notes" ADD CONSTRAINT "invoice_delivery_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_delivery_notes" ADD CONSTRAINT "invoice_delivery_notes_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "delivery_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finance_number_sequences" ADD CONSTRAINT "finance_number_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_number_sequences" ADD CONSTRAINT "finance_number_sequences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "finance_idempotency_keys" ADD CONSTRAINT "finance_idempotency_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_idempotency_keys" ADD CONSTRAINT "finance_idempotency_keys_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_idempotency_keys" ADD CONSTRAINT "finance_idempotency_keys_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
