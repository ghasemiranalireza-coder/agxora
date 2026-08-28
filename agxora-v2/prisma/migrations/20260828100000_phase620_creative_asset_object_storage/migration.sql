-- Phase 62.0: object storage metadata for video assets (additive; IMAGE BYTEA preserved)

CREATE TYPE "CreativeAssetStorageBackend" AS ENUM ('inline_bytea', 'object_s3');

ALTER TABLE "creative_assets"
  ADD COLUMN "storageBackend" "CreativeAssetStorageBackend" NOT NULL DEFAULT 'inline_bytea',
  ADD COLUMN "objectBucket" TEXT,
  ADD COLUMN "objectKey" TEXT,
  ADD COLUMN "durationMs" INTEGER,
  ADD COLUMN "modality" TEXT;

ALTER TABLE "creative_assets" ALTER COLUMN "bytes" DROP NOT NULL;

ALTER TABLE "creative_assets" ADD CONSTRAINT "creative_assets_storage_consistency"
  CHECK (
    ("storageBackend" = 'inline_bytea' AND "bytes" IS NOT NULL AND "objectKey" IS NULL)
    OR
    ("storageBackend" = 'object_s3' AND "bytes" IS NULL AND "objectKey" IS NOT NULL)
  );

CREATE INDEX "creative_assets_objectKey_idx" ON "creative_assets"("objectKey")
  WHERE "objectKey" IS NOT NULL;
