-- Phase 18: durable governed execution identity and append-only evidence.

CREATE TYPE "AgentGovernedExecutionStatus" AS ENUM ('RESERVED', 'COMPLETED', 'FAILED');

CREATE TABLE "agent_governed_executions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "businessGoalId" TEXT,
    "planId" TEXT,
    "stepId" TEXT,
    "capabilityId" TEXT NOT NULL,
    "workerId" TEXT,
    "actorId" TEXT NOT NULL,
    "status" "AgentGovernedExecutionStatus" NOT NULL DEFAULT 'RESERVED',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "approvalGranted" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "outcome" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_governed_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_governed_executions_organizationId_idempotencyKey_key" ON "agent_governed_executions"("organizationId", "idempotencyKey");
CREATE INDEX "agent_governed_executions_organizationId_createdAt_idx" ON "agent_governed_executions"("organizationId", "createdAt");
CREATE INDEX "agent_governed_executions_executionId_idx" ON "agent_governed_executions"("executionId");
CREATE INDEX "agent_governed_executions_businessGoalId_idx" ON "agent_governed_executions"("businessGoalId");
CREATE INDEX "agent_governed_executions_workerId_idx" ON "agent_governed_executions"("workerId");

ALTER TABLE "agent_governed_executions" ADD CONSTRAINT "agent_governed_executions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agent_governed_evidence" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "executionId" TEXT NOT NULL,
    "businessGoalId" TEXT,
    "planId" TEXT,
    "stepId" TEXT,
    "capabilityId" TEXT,
    "workerId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_governed_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_governed_evidence_organizationId_createdAt_idx" ON "agent_governed_evidence"("organizationId", "createdAt");
CREATE INDEX "agent_governed_evidence_executionId_idx" ON "agent_governed_evidence"("executionId");
CREATE INDEX "agent_governed_evidence_businessGoalId_idx" ON "agent_governed_evidence"("businessGoalId");

ALTER TABLE "agent_governed_evidence" ADD CONSTRAINT "agent_governed_evidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
