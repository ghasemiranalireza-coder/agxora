-- Phase 65.0 — async YouTube upload sessions + uploading publish attempt status

ALTER TYPE "CreativePublishAttemptStatus" ADD VALUE IF NOT EXISTS 'uploading';

CREATE TYPE "CreativeYouTubeUploadSessionStatus" AS ENUM (
  'pending',
  'uploading',
  'completed',
  'failed',
  'expired'
);

CREATE TABLE "creative_youtube_upload_sessions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "publishAttemptId" UUID NOT NULL,
  "publishExecutionJobId" TEXT NOT NULL,
  "creativeProjectId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "actorUserId" UUID NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "byteOffset" INTEGER NOT NULL DEFAULT 0,
  "encryptedResumableUrl" TEXT NOT NULL,
  "status" "CreativeYouTubeUploadSessionStatus" NOT NULL,
  "workerClaimId" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "errorReason" TEXT,
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "creative_youtube_upload_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creative_youtube_upload_sessions_publishAttemptId_key"
  ON "creative_youtube_upload_sessions"("publishAttemptId");

CREATE INDEX "creative_youtube_upload_sessions_organizationId_status_leaseExpiresAt_idx"
  ON "creative_youtube_upload_sessions"("organizationId", "status", "leaseExpiresAt");

CREATE INDEX "creative_youtube_upload_sessions_status_expiresAt_idx"
  ON "creative_youtube_upload_sessions"("status", "expiresAt");

ALTER TABLE "creative_youtube_upload_sessions"
  ADD CONSTRAINT "creative_youtube_upload_sessions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creative_youtube_upload_sessions"
  ADD CONSTRAINT "creative_youtube_upload_sessions_publishAttemptId_fkey"
  FOREIGN KEY ("publishAttemptId") REFERENCES "creative_publish_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
