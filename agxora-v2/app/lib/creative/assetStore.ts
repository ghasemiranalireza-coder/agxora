/**
 * Phase 60 / 62.0 — durable creative asset store.
 *
 * IMAGE_AD: inline PostgreSQL BYTEA (Phase 60 default).
 * VIDEO_AD / SOCIAL_VIDEO: object blob storage + DB pointer (Phase 62).
 */

import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  ALLOWED_CREATIVE_IMAGE_MIME_TYPES,
  ALLOWED_CREATIVE_VIDEO_MIME_TYPES,
  MAX_CREATIVE_ASSET_DECODED_BYTES,
  MAX_CREATIVE_VIDEO_DECODED_BYTES,
  MAX_PRIMARY_ASSETS_PER_CREATIVE,
  isAllowedCreativeImageMimeType,
  isAllowedCreativeVideoMimeType,
  isVideoCreativeMimeType,
} from "./assets";
import {
  buildCreativeObjectKey,
  getCreativeBlobConfig,
  getCreativeBlobStore,
} from "./blobStore";
import {
  buildDurableCreativeAssetUrl,
  parseDurableCreativeAssetUrl,
} from "./assetStorePaths";

export { buildDurableCreativeAssetUrl, parseDurableCreativeAssetUrl };

export type CreativeAssetStorageBackend = "inline_bytea" | "object_s3";

export type CreativeAssetRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly modality?: string;
  readonly providerId?: string;
  readonly providerAssetId?: string;
  readonly storageBackend: CreativeAssetStorageBackend;
  readonly objectBucket?: string;
  readonly objectKey?: string;
  /** Present for inline_bytea; loaded on demand for object_s3 via loadCreativeAssetBytes. */
  readonly bytes?: Uint8Array;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreativeAssetPutInput = {
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly assetId: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly modality?: string;
  readonly providerId?: string;
  readonly providerAssetId?: string;
  readonly replaceExisting?: boolean;
};

export type CreativeAssetStore = {
  readonly id: "memory" | "database";
  put(input: CreativeAssetPutInput): Promise<CreativeAssetRecord>;
  get(input: {
    readonly organizationId: string;
    readonly creativeProjectId: string;
    readonly assetId: string;
  }): Promise<CreativeAssetRecord | null>;
  getPrimary(input: {
    readonly organizationId: string;
    readonly creativeProjectId: string;
  }): Promise<CreativeAssetRecord | null>;
  deletePrimary(input: {
    readonly organizationId: string;
    readonly creativeProjectId: string;
  }): Promise<void>;
};

function assertPutInput(input: CreativeAssetPutInput): void {
  if (!input.organizationId?.trim()) {
    throw new PersistenceError("validation", "organizationId is required");
  }
  if (!input.creativeProjectId?.trim()) {
    throw new PersistenceError("validation", "creativeProjectId is required");
  }
  if (!input.assetId?.trim()) {
    throw new PersistenceError("validation", "assetId is required");
  }
  if (!input.bytes || input.bytes.byteLength === 0) {
    throw new PersistenceError("validation", "Asset bytes are empty", {
      details: [{ field: "bytes", message: "empty" }],
    });
  }

  if (isVideoCreativeMimeType(input.mimeType)) {
    if (!isAllowedCreativeVideoMimeType(input.mimeType)) {
      throw new PersistenceError("validation", "Unsupported creative asset MIME type", {
        details: [
          {
            field: "mimeType",
            message: `allowed:${ALLOWED_CREATIVE_VIDEO_MIME_TYPES.join(",")}`,
          },
        ],
      });
    }
    const maxVideo = getCreativeBlobConfig().videoMaxBytes;
    if (input.bytes.byteLength > maxVideo) {
      throw new PersistenceError("validation", "Asset exceeds size limit", {
        details: [{ field: "bytes", message: "provider_asset_too_large" }],
      });
    }
    return;
  }

  if (!isAllowedCreativeImageMimeType(input.mimeType)) {
    throw new PersistenceError("validation", "Unsupported creative asset MIME type", {
      details: [
        {
          field: "mimeType",
          message: `allowed:${ALLOWED_CREATIVE_IMAGE_MIME_TYPES.join(",")}`,
        },
      ],
    });
  }
  if (input.bytes.byteLength > MAX_CREATIVE_ASSET_DECODED_BYTES) {
    throw new PersistenceError("validation", "Asset exceeds size limit", {
      details: [{ field: "bytes", message: "provider_asset_too_large" }],
    });
  }
  void MAX_PRIMARY_ASSETS_PER_CREATIVE;
}

function usesObjectStorage(mimeType: string): boolean {
  return isVideoCreativeMimeType(mimeType);
}

function toRecord(row: {
  id: string;
  organizationId: string;
  creativeProjectId: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  modality: string | null;
  providerId: string | null;
  providerAssetId: string | null;
  storageBackend: CreativeAssetStorageBackend;
  objectBucket: string | null;
  objectKey: string | null;
  bytes: Uint8Array | null;
  createdAt: Date;
  updatedAt: Date;
}): CreativeAssetRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    creativeProjectId: row.creativeProjectId,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    durationMs: row.durationMs ?? undefined,
    modality: row.modality ?? undefined,
    providerId: row.providerId ?? undefined,
    providerAssetId: row.providerAssetId ?? undefined,
    storageBackend: row.storageBackend,
    objectBucket: row.objectBucket ?? undefined,
    objectKey: row.objectKey ?? undefined,
    bytes: row.bytes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Load bytes for a record (inline or object storage). */
export async function loadCreativeAssetBytes(
  record: CreativeAssetRecord,
): Promise<Uint8Array> {
  if (record.storageBackend === "inline_bytea") {
    if (!record.bytes || record.bytes.byteLength === 0) {
      throw new PersistenceError("not_found", "Creative asset bytes missing", {
        details: [{ field: "bytes", message: "empty" }],
      });
    }
    return record.bytes;
  }
  if (!record.objectKey) {
    throw new PersistenceError("not_found", "Creative object key missing", {
      details: [{ field: "objectKey", message: "missing" }],
    });
  }
  const blobStore = getCreativeBlobStore();
  if (!blobStore.isConfigured()) {
    throw new PersistenceError("persistence", "Blob store is not configured", {
      details: [{ field: "blobStore", message: "not_configured" }],
    });
  }
  try {
    return await blobStore.getObjectBytes(record.objectKey);
  } catch {
    throw new PersistenceError("persistence", "Failed to load creative asset bytes", {
      details: [{ field: "objectKey", message: "storage_get_failed" }],
    });
  }
}

async function putObjectAsset(
  input: CreativeAssetPutInput,
): Promise<CreativeAssetRecord> {
  const blobStore = getCreativeBlobStore();
  if (!blobStore.isConfigured()) {
    throw new PersistenceError("persistence", "Blob store is not configured", {
      details: [{ field: "blobStore", message: "not_configured" }],
    });
  }
  const config = getCreativeBlobConfig();
  const objectKey = buildCreativeObjectKey({
    organizationId: input.organizationId,
    creativeProjectId: input.creativeProjectId,
    assetId: input.assetId,
  });

  let oldObjectKey: string | undefined;
  if (input.replaceExisting) {
    const existing = await prisma.creativeAsset.findUnique({
      where: {
        organizationId_creativeProjectId: {
          organizationId: input.organizationId,
          creativeProjectId: input.creativeProjectId,
        },
      },
    });
    if (existing?.objectKey) oldObjectKey = existing.objectKey;
  }

  try {
    await blobStore.putObject({
      key: objectKey,
      bytes: input.bytes,
      mimeType: input.mimeType,
    });
  } catch {
    throw new PersistenceError("persistence", "Failed to persist creative blob", {
      details: [{ field: "objectKey", message: "storage_put_failed" }],
    });
  }

  const bucket = config.s3?.bucket ?? "memory";

  try {
    const row = await prisma.creativeAsset.upsert({
      where: {
        organizationId_creativeProjectId: {
          organizationId: input.organizationId,
          creativeProjectId: input.creativeProjectId,
        },
      },
      create: {
        id: input.assetId,
        organizationId: input.organizationId,
        creativeProjectId: input.creativeProjectId,
        mimeType: input.mimeType,
        byteSize: input.bytes.byteLength,
        width: input.width ?? null,
        height: input.height ?? null,
        durationMs: input.durationMs ?? null,
        modality: input.modality ?? "video",
        providerId: input.providerId ?? null,
        providerAssetId: input.providerAssetId ?? null,
        storageBackend: "object_s3",
        objectBucket: bucket,
        objectKey,
        bytes: null,
      },
      update: {
        id: input.assetId,
        mimeType: input.mimeType,
        byteSize: input.bytes.byteLength,
        width: input.width ?? null,
        height: input.height ?? null,
        durationMs: input.durationMs ?? null,
        modality: input.modality ?? "video",
        providerId: input.providerId ?? null,
        providerAssetId: input.providerAssetId ?? null,
        storageBackend: "object_s3",
        objectBucket: bucket,
        objectKey,
        bytes: null,
      },
    });

    if (oldObjectKey && oldObjectKey !== objectKey) {
      try {
        await blobStore.deleteObject(oldObjectKey);
      } catch {
        // Best-effort cleanup; DB already points at new object.
      }
    }

    return toRecord({ ...row, bytes: null });
  } catch (error) {
    try {
      await blobStore.deleteObject(objectKey);
    } catch {
      // Compensating delete best-effort.
    }
    throw new PersistenceError(
      "persistence",
      "Failed to persist creative asset metadata",
      {
        details: [
          {
            field: "creativeAsset",
            message: error instanceof Error ? error.name : "storage_put_failed",
          },
        ],
      },
    );
  }
}

/** In-memory store for tests / local without Postgres creative assets. */
export function createMemoryCreativeAssetStore(): CreativeAssetStore {
  const byKey = new Map<string, CreativeAssetRecord>();
  const blobStore = getCreativeBlobStore();

  const primaryKey = (organizationId: string, creativeProjectId: string) =>
    `${organizationId}::${creativeProjectId}`;

  return {
    id: "memory",
    async put(input) {
      assertPutInput(input);
      const now = new Date().toISOString();
      let record: CreativeAssetRecord;

      if (usesObjectStorage(input.mimeType)) {
        const objectKey = buildCreativeObjectKey({
          organizationId: input.organizationId,
          creativeProjectId: input.creativeProjectId,
          assetId: input.assetId,
        });
        const old = byKey.get(primaryKey(input.organizationId, input.creativeProjectId));
        await blobStore.putObject({
          key: objectKey,
          bytes: input.bytes,
          mimeType: input.mimeType,
        });
        record = {
          id: input.assetId,
          organizationId: input.organizationId,
          creativeProjectId: input.creativeProjectId,
          mimeType: input.mimeType,
          byteSize: input.bytes.byteLength,
          width: input.width,
          height: input.height,
          durationMs: input.durationMs,
          modality: input.modality ?? "video",
          providerId: input.providerId,
          providerAssetId: input.providerAssetId,
          storageBackend: "object_s3",
          objectBucket: "memory",
          objectKey,
          createdAt: now,
          updatedAt: now,
        };
        if (input.replaceExisting && old?.objectKey && old.objectKey !== objectKey) {
          try {
            await blobStore.deleteObject(old.objectKey);
          } catch {
            /* best effort */
          }
        }
      } else {
        record = {
          id: input.assetId,
          organizationId: input.organizationId,
          creativeProjectId: input.creativeProjectId,
          mimeType: input.mimeType,
          byteSize: input.bytes.byteLength,
          width: input.width,
          height: input.height,
          durationMs: input.durationMs,
          modality: input.modality ?? "image",
          providerId: input.providerId,
          providerAssetId: input.providerAssetId,
          storageBackend: "inline_bytea",
          bytes: input.bytes,
          createdAt: now,
          updatedAt: now,
        };
      }
      byKey.set(primaryKey(input.organizationId, input.creativeProjectId), record);
      return record;
    },
    async get(input) {
      const record = byKey.get(
        primaryKey(input.organizationId, input.creativeProjectId),
      );
      if (!record) return null;
      if (record.id !== input.assetId) return null;
      if (record.storageBackend === "object_s3" && record.objectKey) {
        const bytes = await blobStore.getObjectBytes(record.objectKey);
        return { ...record, bytes };
      }
      return record;
    },
    async getPrimary(input) {
      return byKey.get(primaryKey(input.organizationId, input.creativeProjectId)) ?? null;
    },
    async deletePrimary(input) {
      const key = primaryKey(input.organizationId, input.creativeProjectId);
      const record = byKey.get(key);
      if (record?.objectKey) {
        try {
          await blobStore.deleteObject(record.objectKey);
        } catch {
          /* best effort */
        }
      }
      byKey.delete(key);
    },
  };
}

export function createDatabaseCreativeAssetStore(): CreativeAssetStore {
  return {
    id: "database",
    async put(input) {
      assertPutInput(input);
      if (usesObjectStorage(input.mimeType)) {
        return putObjectAsset(input);
      }
      try {
        const row = await prisma.creativeAsset.upsert({
          where: {
            organizationId_creativeProjectId: {
              organizationId: input.organizationId,
              creativeProjectId: input.creativeProjectId,
            },
          },
          create: {
            id: input.assetId,
            organizationId: input.organizationId,
            creativeProjectId: input.creativeProjectId,
            mimeType: input.mimeType,
            byteSize: input.bytes.byteLength,
            width: input.width ?? null,
            height: input.height ?? null,
            durationMs: input.durationMs ?? null,
            modality: input.modality ?? "image",
            providerId: input.providerId ?? null,
            providerAssetId: input.providerAssetId ?? null,
            storageBackend: "inline_bytea",
            bytes: Buffer.from(input.bytes),
          },
          update: {
            id: input.assetId,
            mimeType: input.mimeType,
            byteSize: input.bytes.byteLength,
            width: input.width ?? null,
            height: input.height ?? null,
            durationMs: input.durationMs ?? null,
            modality: input.modality ?? "image",
            providerId: input.providerId ?? null,
            providerAssetId: input.providerAssetId ?? null,
            storageBackend: "inline_bytea",
            objectBucket: null,
            objectKey: null,
            bytes: Buffer.from(input.bytes),
          },
        });
        return toRecord({
          ...row,
          bytes: new Uint8Array(row.bytes ?? Buffer.alloc(0)),
        });
      } catch (error) {
        throw new PersistenceError(
          "persistence",
          "Failed to persist creative asset",
          {
            details: [
              {
                field: "creativeAsset",
                message:
                  error instanceof Error ? error.name : "storage_put_failed",
              },
            ],
          },
        );
      }
    },
    async get(input) {
      try {
        const row = await prisma.creativeAsset.findUnique({
          where: {
            organizationId_creativeProjectId: {
              organizationId: input.organizationId,
              creativeProjectId: input.creativeProjectId,
            },
          },
        });
        if (!row) return null;
        if (row.id !== input.assetId) return null;
        if (row.organizationId !== input.organizationId) return null;
        const record = toRecord({
          ...row,
          storageBackend: row.storageBackend as CreativeAssetStorageBackend,
          bytes: row.bytes ? new Uint8Array(row.bytes) : null,
        });
        if (record.storageBackend === "object_s3") {
          const bytes = await loadCreativeAssetBytes(record);
          return { ...record, bytes };
        }
        return record;
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw new PersistenceError(
          "persistence",
          "Failed to load creative asset",
          {
            details: [
              {
                field: "creativeAsset",
                message:
                  error instanceof Error ? error.name : "storage_get_failed",
              },
            ],
          },
        );
      }
    },
    async getPrimary(input) {
      try {
        const row = await prisma.creativeAsset.findUnique({
          where: {
            organizationId_creativeProjectId: {
              organizationId: input.organizationId,
              creativeProjectId: input.creativeProjectId,
            },
          },
        });
        if (!row) return null;
        if (row.organizationId !== input.organizationId) return null;
        return toRecord({
          ...row,
          storageBackend: row.storageBackend as CreativeAssetStorageBackend,
          bytes: row.bytes ? new Uint8Array(row.bytes) : null,
        });
      } catch (error) {
        throw new PersistenceError(
          "persistence",
          "Failed to load creative asset",
          {
            details: [
              {
                field: "creativeAsset",
                message:
                  error instanceof Error ? error.name : "storage_get_failed",
              },
            ],
          },
        );
      }
    },
    async deletePrimary(input) {
      try {
        const row = await prisma.creativeAsset.findUnique({
          where: {
            organizationId_creativeProjectId: {
              organizationId: input.organizationId,
              creativeProjectId: input.creativeProjectId,
            },
          },
        });
        if (row?.objectKey && row.storageBackend === "object_s3") {
          try {
            await getCreativeBlobStore().deleteObject(row.objectKey);
          } catch {
            /* best effort */
          }
        }
        await prisma.creativeAsset.deleteMany({
          where: {
            organizationId: input.organizationId,
            creativeProjectId: input.creativeProjectId,
          },
        });
      } catch (error) {
        throw new PersistenceError(
          "persistence",
          "Failed to delete creative asset",
          {
            details: [
              {
                field: "creativeAsset",
                message:
                  error instanceof Error ? error.name : "storage_delete_failed",
              },
            ],
          },
        );
      }
    },
  };
}

function resolveDefaultStore(): CreativeAssetStore {
  const raw = (process.env.AGXORA_CREATIVE_ASSET_STORE ?? "").toLowerCase();
  if (raw === "memory") return createMemoryCreativeAssetStore();
  if (raw === "database") return createDatabaseCreativeAssetStore();
  if (process.env.NODE_ENV === "test") return createMemoryCreativeAssetStore();
  return createDatabaseCreativeAssetStore();
}

let storeOverride: CreativeAssetStore | null = null;
let defaultStore: CreativeAssetStore | null = null;

export function getCreativeAssetStore(): CreativeAssetStore {
  if (storeOverride) return storeOverride;
  if (!defaultStore) defaultStore = resolveDefaultStore();
  return defaultStore;
}

/** Test-only store injection. */
export function setCreativeAssetStoreForTests(
  store: CreativeAssetStore | null,
): void {
  storeOverride = store;
  if (store === null) {
    defaultStore = null;
  }
}

export { MAX_CREATIVE_VIDEO_DECODED_BYTES };
