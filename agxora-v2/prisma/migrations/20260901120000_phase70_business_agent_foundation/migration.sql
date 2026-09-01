-- Phase 70 — business agent foundation (integrations, policy, runs, campaigns, audit).
-- Does not store OAuth tokens. YouTube tokens remain in social_platform_credentials.

CREATE TYPE "IntegrationProvider" AS ENUM ('email_gmail', 'email_microsoft', 'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x');

CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('not_connected', 'connected', 'disconnected', 'error');

CREATE TYPE "AutonomyMode" AS ENUM ('SAFE', 'ASSISTED', 'AUTONOMOUS');

CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'needs_approval', 'approved', 'scheduled', 'executing', 'completed', 'failed', 'cancelled');

CREATE TYPE "ContentItemStatus" AS ENUM ('DRAFT', 'NEEDS_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TYPE "ExternalActionStatus" AS ENUM ('planned', 'approval_required', 'executing', 'completed', 'failed', 'cancelled');

CREATE TABLE "integration_connections" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'not_connected',
    "accountLabel" TEXT,
    "externalAccountId" TEXT,
    "lastError" TEXT,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canCreateDraft" BOOLEAN NOT NULL DEFAULT true,
    "canSchedule" BOOLEAN NOT NULL DEFAULT false,
    "canPublish" BOOLEAN NOT NULL DEFAULT false,
    "canSendEmail" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID NOT NULL,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_policies" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "mode" "AutonomyMode" NOT NULL DEFAULT 'SAFE',
    "updatedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "channels" "IntegrationProvider"[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaign_items" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "approvedByUserId" UUID,
    "provider" "IntegrationProvider" NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "script" TEXT NOT NULL DEFAULT '',
    "mediaRequirement" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "ContentItemStatus" NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_runs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "campaignId" UUID,
    "goal" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_run_steps" (
    "id" UUID NOT NULL,
    "agentRunId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_run_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_action_audits" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "agentRunId" UUID,
    "provider" "IntegrationProvider",
    "action" TEXT NOT NULL,
    "target" TEXT,
    "status" "ExternalActionStatus" NOT NULL,
    "externalId" TEXT,
    "error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_action_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_connections_organizationId_workspaceId_provider_key" ON "integration_connections"("organizationId", "workspaceId", "provider");
CREATE INDEX "integration_connections_organizationId_workspaceId_idx" ON "integration_connections"("organizationId", "workspaceId");
CREATE INDEX "integration_connections_workspaceId_provider_idx" ON "integration_connections"("workspaceId", "provider");

CREATE UNIQUE INDEX "agent_policies_organizationId_workspaceId_key" ON "agent_policies"("organizationId", "workspaceId");
CREATE INDEX "agent_policies_workspaceId_idx" ON "agent_policies"("workspaceId");

CREATE INDEX "campaigns_organizationId_workspaceId_createdAt_idx" ON "campaigns"("organizationId", "workspaceId", "createdAt");
CREATE INDEX "campaigns_workspaceId_status_idx" ON "campaigns"("workspaceId", "status");

CREATE INDEX "campaign_items_organizationId_workspaceId_scheduledAt_idx" ON "campaign_items"("organizationId", "workspaceId", "scheduledAt");
CREATE INDEX "campaign_items_campaignId_status_idx" ON "campaign_items"("campaignId", "status");
CREATE INDEX "campaign_items_workspaceId_provider_status_idx" ON "campaign_items"("workspaceId", "provider", "status");

CREATE INDEX "agent_runs_organizationId_workspaceId_createdAt_idx" ON "agent_runs"("organizationId", "workspaceId", "createdAt");
CREATE INDEX "agent_runs_workspaceId_status_idx" ON "agent_runs"("workspaceId", "status");
CREATE INDEX "agent_runs_userId_idx" ON "agent_runs"("userId");

CREATE UNIQUE INDEX "agent_run_steps_agentRunId_ordinal_key" ON "agent_run_steps"("agentRunId", "ordinal");
CREATE INDEX "agent_run_steps_organizationId_workspaceId_idx" ON "agent_run_steps"("organizationId", "workspaceId");

CREATE INDEX "external_action_audits_organizationId_workspaceId_createdAt_idx" ON "external_action_audits"("organizationId", "workspaceId", "createdAt");
CREATE INDEX "external_action_audits_workspaceId_action_createdAt_idx" ON "external_action_audits"("workspaceId", "action", "createdAt");
CREATE INDEX "external_action_audits_userId_createdAt_idx" ON "external_action_audits"("userId", "createdAt");

ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_policies" ADD CONSTRAINT "agent_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_policies" ADD CONSTRAINT "agent_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agent_run_steps" ADD CONSTRAINT "agent_run_steps_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_action_audits" ADD CONSTRAINT "external_action_audits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_action_audits" ADD CONSTRAINT "external_action_audits_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_action_audits" ADD CONSTRAINT "external_action_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
