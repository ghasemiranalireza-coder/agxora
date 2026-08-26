-- Phase 56: Agent OS server persistence (org-scoped v7 JSON snapshot)

CREATE TABLE "agent_os_states" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 7,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_os_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_os_states_organizationId_key" ON "agent_os_states"("organizationId");

CREATE INDEX "agent_os_states_organizationId_idx" ON "agent_os_states"("organizationId");

ALTER TABLE "agent_os_states" ADD CONSTRAINT "agent_os_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
