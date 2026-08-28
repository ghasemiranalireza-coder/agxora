/**
 * Phase 62.0 — server-only blob storage configuration.
 */

import "server-only";

export type CreativeBlobStoreKind = "memory" | "s3";

export type CreativeBlobS3Config = {
  readonly endpoint: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly region: string;
};

export type CreativeBlobConfig = {
  readonly store: CreativeBlobStoreKind;
  readonly s3: CreativeBlobS3Config | null;
  readonly videoMaxBytes: number;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getCreativeBlobConfig(): CreativeBlobConfig {
  const rawStore = (process.env.AGXORA_CREATIVE_BLOB_STORE ?? "").toLowerCase();
  let store: CreativeBlobStoreKind = "memory";
  if (rawStore === "s3") store = "s3";
  if (rawStore === "memory") store = "memory";
  if (!rawStore && process.env.NODE_ENV === "test") store = "memory";
  if (!rawStore && process.env.NODE_ENV !== "test") {
    // Production default: S3 when credentials present, else memory-only tests/dev fallback.
    const hasS3 =
      Boolean(process.env.AGXORA_CREATIVE_BLOB_S3_BUCKET?.trim()) &&
      Boolean(process.env.AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID?.trim()) &&
      Boolean(process.env.AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY?.trim());
    store = hasS3 ? "s3" : "memory";
  }

  const bucket = process.env.AGXORA_CREATIVE_BLOB_S3_BUCKET?.trim() ?? "";
  const accessKeyId = process.env.AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey =
    process.env.AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY?.trim() ?? "";
  const endpoint =
    process.env.AGXORA_CREATIVE_BLOB_S3_ENDPOINT?.trim() ||
    "https://s3.amazonaws.com";
  const region = process.env.AGXORA_CREATIVE_BLOB_S3_REGION?.trim() || "auto";

  const s3Configured =
    bucket.length > 0 && accessKeyId.length > 0 && secretAccessKey.length > 0;

  return {
    store: store === "s3" && !s3Configured ? "memory" : store,
    s3: s3Configured
      ? { endpoint, bucket, accessKeyId, secretAccessKey, region }
      : null,
    videoMaxBytes: envInt("AGXORA_CREATIVE_VIDEO_MAX_BYTES", 104_857_600),
  };
}
