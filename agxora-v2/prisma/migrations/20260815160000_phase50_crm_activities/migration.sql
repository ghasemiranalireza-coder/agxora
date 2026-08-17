-- Phase 50: CRM customer profile activities (immutable event log; not IAM audit)

CREATE TABLE "customer_activities" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "actor" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_activities_customerId_idx" ON "customer_activities"("customerId");

CREATE INDEX "customer_activities_workspaceId_idx" ON "customer_activities"("workspaceId");

CREATE INDEX "customer_activities_organizationId_idx" ON "customer_activities"("organizationId");

CREATE INDEX "customer_activities_customerId_createdAt_idx" ON "customer_activities"("customerId", "createdAt");

CREATE INDEX "customer_activities_workspaceId_customerId_idx" ON "customer_activities"("workspaceId", "customerId");

ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
