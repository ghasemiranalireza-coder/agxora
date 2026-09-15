-- Phase 6.1: finance document templates, branding, historical snapshots (additive)

CREATE TYPE "FinanceDocumentTemplate" AS ENUM ('CLASSIC', 'MODERN', 'COMPACT', 'PROFESSIONAL');

ALTER TABLE "delivery_notes" ADD COLUMN "documentSnapshot" JSONB;

ALTER TABLE "finance_invoices" ADD COLUMN "documentSnapshot" JSONB;

CREATE TABLE "finance_document_logos" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "byteSize" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_document_logos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_document_settings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "invoiceTemplate" "FinanceDocumentTemplate" NOT NULL DEFAULT 'CLASSIC',
    "deliveryNoteTemplate" "FinanceDocumentTemplate" NOT NULL DEFAULT 'CLASSIC',
    "companyName" TEXT NOT NULL DEFAULT '',
    "street" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "vatId" TEXT NOT NULL DEFAULT '',
    "taxNumber" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "bic" TEXT NOT NULL DEFAULT '',
    "commercialRegister" TEXT NOT NULL DEFAULT '',
    "managingDirector" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '#1B365D',
    "secondaryColor" TEXT NOT NULL DEFAULT '#C4A35A',
    "logoId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_document_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finance_document_settings_workspaceId_key" ON "finance_document_settings"("workspaceId");

CREATE INDEX "finance_document_logos_organizationId_idx" ON "finance_document_logos"("organizationId");
CREATE INDEX "finance_document_logos_workspaceId_idx" ON "finance_document_logos"("workspaceId");
CREATE INDEX "finance_document_settings_organizationId_idx" ON "finance_document_settings"("organizationId");
CREATE INDEX "finance_document_settings_logoId_idx" ON "finance_document_settings"("logoId");

ALTER TABLE "finance_document_logos" ADD CONSTRAINT "finance_document_logos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_document_logos" ADD CONSTRAINT "finance_document_logos_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_document_logos" ADD CONSTRAINT "finance_document_logos_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finance_document_settings" ADD CONSTRAINT "finance_document_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_document_settings" ADD CONSTRAINT "finance_document_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_document_settings" ADD CONSTRAINT "finance_document_settings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "finance_document_logos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
