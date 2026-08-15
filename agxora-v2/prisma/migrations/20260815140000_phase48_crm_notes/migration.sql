-- Phase 48: CRM Note entity persistence (Notes only; Documents/Activities deferred)

CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_customerId_idx" ON "notes"("customerId");

CREATE INDEX "notes_workspaceId_idx" ON "notes"("workspaceId");

CREATE INDEX "notes_organizationId_idx" ON "notes"("organizationId");

CREATE INDEX "notes_customerId_createdAt_idx" ON "notes"("customerId", "createdAt");

CREATE INDEX "notes_workspaceId_customerId_idx" ON "notes"("workspaceId", "customerId");

ALTER TABLE "notes" ADD CONSTRAINT "notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
