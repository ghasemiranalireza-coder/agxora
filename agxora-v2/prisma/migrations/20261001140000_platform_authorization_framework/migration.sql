-- External platform authorization framework.
-- Additive. Does not store external passwords or OAuth tokens.

ALTER TYPE "IntegrationConnectionStatus" ADD VALUE 'expired';
ALTER TYPE "IntegrationConnectionStatus" ADD VALUE 'revoked';

ALTER TABLE "integration_connections"
  ADD COLUMN "aiContentAuthorized" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "automaticPublishingAuthorized" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "authorizationVersion" TEXT,
  ADD COLUMN "lastSuccessfulSync" TIMESTAMP(3),
  ADD COLUMN "grantedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TYPE "LegalAuthorizationType" AS ENUM (
  'agb',
  'privacy',
  'platform',
  'ai_content',
  'automatic_publishing',
  'marketing'
);

CREATE TYPE "PlatformAuthorizationStatus" AS ENUM (
  'pending',
  'connected',
  'disconnected',
  'expired',
  'revoked',
  'error'
);

CREATE TABLE "legal_acceptances" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "legalDocument" TEXT NOT NULL,
  "legalDocumentVersion" TEXT NOT NULL,
  "authorizationType" "LegalAuthorizationType" NOT NULL,
  "platform" TEXT,
  "authorizationVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_acceptances_organizationId_userId_authorizationType_idx"
  ON "legal_acceptances"("organizationId", "userId", "authorizationType");
CREATE INDEX "legal_acceptances_userId_legalDocument_legalDocumentVersion_idx"
  ON "legal_acceptances"("userId", "legalDocument", "legalDocumentVersion");

ALTER TABLE "legal_acceptances"
  ADD CONSTRAINT "legal_acceptances_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_acceptances"
  ADD CONSTRAINT "legal_acceptances_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "platform_authorizations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "connectionId" UUID,
  "provider" "IntegrationProvider" NOT NULL,
  "externalAccountId" TEXT,
  "accountLabel" TEXT,
  "status" "PlatformAuthorizationStatus" NOT NULL DEFAULT 'pending',
  "grantedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "authorizationVersion" TEXT NOT NULL,
  "legalDocumentVersion" TEXT NOT NULL,
  "aiContentAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "automaticPublishingAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "confirmationText" TEXT NOT NULL,
  "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "lastSuccessfulSync" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_authorizations_organizationId_workspaceId_provider_key"
  ON "platform_authorizations"("organizationId", "workspaceId", "provider");
CREATE INDEX "platform_authorizations_organizationId_userId_idx"
  ON "platform_authorizations"("organizationId", "userId");
CREATE INDEX "platform_authorizations_organizationId_status_idx"
  ON "platform_authorizations"("organizationId", "status");

ALTER TABLE "platform_authorizations"
  ADD CONSTRAINT "platform_authorizations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_authorizations"
  ADD CONSTRAINT "platform_authorizations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_authorizations"
  ADD CONSTRAINT "platform_authorizations_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "platform_permissions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "authorizationId" UUID NOT NULL,
  "permissionKey" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_permissions_authorizationId_permissionKey_key"
  ON "platform_permissions"("authorizationId", "permissionKey");
CREATE INDEX "platform_permissions_organizationId_permissionKey_idx"
  ON "platform_permissions"("organizationId", "permissionKey");

ALTER TABLE "platform_permissions"
  ADD CONSTRAINT "platform_permissions_authorizationId_fkey"
  FOREIGN KEY ("authorizationId") REFERENCES "platform_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "authorization_audit_logs" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workspaceId" UUID,
  "provider" TEXT NOT NULL,
  "externalAccountId" TEXT,
  "authorizationStatus" TEXT NOT NULL,
  "grantedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "authorizationVersion" TEXT NOT NULL,
  "legalDocument" TEXT,
  "legalDocumentVersion" TEXT,
  "authorizationType" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "authorizedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "authorization_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "authorization_audit_logs_organizationId_createdAt_idx"
  ON "authorization_audit_logs"("organizationId", "createdAt");
CREATE INDEX "authorization_audit_logs_userId_createdAt_idx"
  ON "authorization_audit_logs"("userId", "createdAt");
CREATE INDEX "authorization_audit_logs_organizationId_provider_createdAt_idx"
  ON "authorization_audit_logs"("organizationId", "provider", "createdAt");

ALTER TABLE "authorization_audit_logs"
  ADD CONSTRAINT "authorization_audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authorization_audit_logs"
  ADD CONSTRAINT "authorization_audit_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
