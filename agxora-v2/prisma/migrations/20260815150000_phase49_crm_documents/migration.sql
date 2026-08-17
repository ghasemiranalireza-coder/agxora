-- Phase 49: CRM document metadata persistence (metadata only; blob storage deferred)

CREATE TABLE "customer_documents" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "size" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_documents_customerId_idx" ON "customer_documents"("customerId");

CREATE INDEX "customer_documents_workspaceId_idx" ON "customer_documents"("workspaceId");

CREATE INDEX "customer_documents_organizationId_idx" ON "customer_documents"("organizationId");

CREATE INDEX "customer_documents_customerId_createdAt_idx" ON "customer_documents"("customerId", "createdAt");

CREATE INDEX "customer_documents_workspaceId_customerId_idx" ON "customer_documents"("workspaceId", "customerId");

ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
