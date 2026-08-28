/**
 * Phase 60 — durable creative IMAGE_AD asset store.
 *
 * Bytes live outside Agent OS v7 JSON. Default production backend is PostgreSQL
 * (existing DATABASE_URL). Tests inject an in-memory store.
 */

import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  ALLOWED_CREATIVE_IMAGE_MIME_TYPES,
  MAX_CREATIVE_ASSET_DECODED_BYTES,
  MAX_PRIMARY_ASSETS_PER_CREATIVE,
  isAllowedCreativeImageMimeType,
} from "./assets";
import {
  buildDurableCreativeAssetUrl,
  parseDurableCreativeAssetUrl,
} from "./assetStorePaths";

export { buildDurableCreativeAssetUrl, parseDurableCreativeAssetUrl };

export type CreativeAssetRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly width?: number;
  readonly height?: number;
  readonly providerId?: string;
  readonly providerAssetId?: string;
  readonly bytes: Uint8Array;
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
  readonly providerId?: string;
  readonly providerAssetId?: string;
};

export type CreativeAssetStore = {
  readonly id: "memory" | "database";
  put(input: CreativeAssetPutInput): Promise<CreativeAssetRecord>;
  get(input: {
    readonly organizationId: string;
    readonly creativeProjectId: string;
    readonly assetId: string;
  }): Promise<CreativeAssetRecord | null>;
  /** Primary asset for (organizationId, creativeProjectId), if any. */
  getPrimary(input: {
    readonly organizationId: string;
    readonly creativeProjectId: string;
  }): Promise<CreativeAssetRecord | null>;
  /** Remove the primary asset for a creative (regenerate replace). */
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
  if (input.bytes.byteLength > MAX_CREATIVE_ASSET_DECODED_BYTES) {
    throw new PersistenceError("validation", "Asset exceeds size limit", {
      details: [{ field: "bytes", message: "provider_asset_too_large" }],
    });
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
  void MAX_PRIMARY_ASSETS_PER_CREATIVE;
}

function toRecord(row: {
  id: string;
  organizationId: string;
  creativeProjectId: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  providerId: string | null;
  providerAssetId: string | null;
  bytes: Uint8Array;
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
    providerId: row.providerId ?? undefined,
    providerAssetId: row.providerAssetId ?? undefined,
    bytes: row.bytes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** In-memory store for tests / local without Postgres creative assets. */
export function createMemoryCreativeAssetStore(): CreativeAssetStore {
  const byKey = new Map<string, CreativeAssetRecord>();

  const primaryKey = (organizationId: string, creativeProjectId: string) =>
    `${organizationId}::${creativeProjectId}`;

  return {
    id: "memory",
    async put(input) {
      assertPutInput(input);
      const now = new Date().toISOString();
      const record: CreativeAssetRecord = {
        id: input.assetId,
        organizationId: input.organizationId,
        creativeProjectId: input.creativeProjectId,
        mimeType: input.mimeType,
        byteSize: input.bytes.byteLength,
        width: input.width,
        height: input.height,
        providerId: input.providerId,
        providerAssetId: input.providerAssetId,
        bytes: input.bytes,
        createdAt: now,
        updatedAt: now,
      };
      // One primary asset per creative — replace in place.
      byKey.set(primaryKey(input.organizationId, input.creativeProjectId), record);
      return record;
    },
    async get(input) {
      const record = byKey.get(
        primaryKey(input.organizationId, input.creativeProjectId),
      );
      if (!record) return null;
      if (record.id !== input.assetId) return null;
      return record;
    },
    async getPrimary(input) {
      return byKey.get(primaryKey(input.organizationId, input.creativeProjectId)) ?? null;
    },
    async deletePrimary(input) {
      byKey.delete(primaryKey(input.organizationId, input.creativeProjectId));
    },
  };
}

export function createDatabaseCreativeAssetStore(): CreativeAssetStore {
  return {
    id: "database",
    async put(input) {
      assertPutInput(input);
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
            providerId: input.providerId ?? null,
            providerAssetId: input.providerAssetId ?? null,
            bytes: Buffer.from(input.bytes),
          },
          update: {
            id: input.assetId,
            mimeType: input.mimeType,
            byteSize: input.bytes.byteLength,
            width: input.width ?? null,
            height: input.height ?? null,
            providerId: input.providerId ?? null,
            providerAssetId: input.providerAssetId ?? null,
            bytes: Buffer.from(input.bytes),
          },
        });
        return toRecord({
          ...row,
          bytes: new Uint8Array(row.bytes),
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
        return toRecord({
          ...row,
          bytes: new Uint8Array(row.bytes),
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
          bytes: new Uint8Array(row.bytes),
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
  // Production / first-customer path uses Postgres. Tests inject memory.
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
