-- Phase 60: durable creative IMAGE_AD asset bytes (outside Agent OS v7 JSON)

CREATE TABLE "creative_assets" (
    "id" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "creativeProjectId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "providerId" TEXT,
    "providerAssetId" TEXT,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creative_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creative_assets_organizationId_creativeProjectId_key" ON "creative_assets"("organizationId", "creativeProjectId");

CREATE INDEX "creative_assets_organizationId_idx" ON "creative_assets"("organizationId");

CREATE INDEX "creative_assets_organizationId_creativeProjectId_idx" ON "creative_assets"("organizationId", "creativeProjectId");

ALTER TABLE "creative_assets" ADD CONSTRAINT "creative_assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
