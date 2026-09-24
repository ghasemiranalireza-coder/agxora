-- Phase 18 remediation: explicit in-flight and ambiguous email states.
-- Additive. Existing rows stay RESERVED, COMPLETED, or FAILED.

ALTER TYPE "AgentGovernedExecutionStatus" ADD VALUE 'EXECUTING';
ALTER TYPE "AgentGovernedExecutionStatus" ADD VALUE 'AMBIGUOUS';

ALTER TABLE "agent_governed_executions" ADD COLUMN "attemptStartedAt" TIMESTAMP(3);
