-- Phase 63.1 — YouTube publish hardening foundation

CREATE TYPE "SocialPlatform" AS ENUM ('youtube');

CREATE TYPE "CreativePublishAttemptStatus" AS ENUM ('in_flight', 'succeeded', 'failed', 'unavailable');

CREATE TABLE "social_platform_credentials" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "externalAccountId" TEXT,
    "externalAccountName" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "encryptedPayload" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_platform_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_oauth_states" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "stateHash" TEXT NOT NULL,
    "codeVerifierHash" TEXT NOT NULL,
    "encryptedCodeVerifier" TEXT NOT NULL,
    "redirectPath" TEXT,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creative_publish_attempts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "publishExecutionJobId" TEXT NOT NULL,
    "creativeProjectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "CreativePublishAttemptStatus" NOT NULL,
    "publishResult" JSONB,
    "externalId" TEXT,
    "errorReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creative_publish_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_platform_credentials_organizationId_platform_key" ON "social_platform_credentials"("organizationId", "platform");
CREATE INDEX "social_platform_credentials_organizationId_idx" ON "social_platform_credentials"("organizationId");

CREATE UNIQUE INDEX "social_oauth_states_stateHash_key" ON "social_oauth_states"("stateHash");
CREATE INDEX "social_oauth_states_organizationId_platform_idx" ON "social_oauth_states"("organizationId", "platform");
CREATE INDEX "social_oauth_states_expiresAt_idx" ON "social_oauth_states"("expiresAt");

CREATE UNIQUE INDEX "creative_publish_attempts_organizationId_publishExecutionJobId_key" ON "creative_publish_attempts"("organizationId", "publishExecutionJobId");
CREATE INDEX "creative_publish_attempts_organizationId_idempotencyKey_idx" ON "creative_publish_attempts"("organizationId", "idempotencyKey");
CREATE INDEX "creative_publish_attempts_status_expiresAt_idx" ON "creative_publish_attempts"("status", "expiresAt");

ALTER TABLE "social_platform_credentials" ADD CONSTRAINT "social_platform_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_oauth_states" ADD CONSTRAINT "social_oauth_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_oauth_states" ADD CONSTRAINT "social_oauth_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creative_publish_attempts" ADD CONSTRAINT "creative_publish_attempts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
