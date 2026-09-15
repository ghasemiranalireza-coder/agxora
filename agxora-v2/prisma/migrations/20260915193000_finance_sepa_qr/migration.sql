-- Phase 6.2: SEPA/EPC QR settings (additive, non-destructive)

ALTER TABLE "finance_document_settings" ADD COLUMN "qrEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "finance_document_settings" ADD COLUMN "qrPosition" TEXT NOT NULL DEFAULT 'BOTTOM_RIGHT';
ALTER TABLE "finance_document_settings" ADD COLUMN "qrIncludeAmount" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "finance_document_settings" ADD COLUMN "qrIncludeInvoiceNumber" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "finance_document_settings" ADD COLUMN "qrIncludeCustomerName" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "finance_document_settings" ADD COLUMN "qrRemittanceText" TEXT NOT NULL DEFAULT '';
