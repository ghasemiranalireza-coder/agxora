-- Phase 45-B: controlled ownership transfer (hashed confirmation token)

CREATE TABLE "ownership_transfers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ownership_transfers_tokenHash_key" ON "ownership_transfers"("tokenHash");

CREATE INDEX "ownership_transfers_organizationId_expiresAt_idx" ON "ownership_transfers"("organizationId", "expiresAt");

CREATE INDEX "ownership_transfers_workspaceId_idx" ON "ownership_transfers"("workspaceId");

CREATE INDEX "ownership_transfers_fromUserId_idx" ON "ownership_transfers"("fromUserId");

CREATE INDEX "ownership_transfers_toUserId_idx" ON "ownership_transfers"("toUserId");

ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
