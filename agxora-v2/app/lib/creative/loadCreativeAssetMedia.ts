/**
 * Phase 63.1 — load creative asset media for publish (buffer images, stream video).
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { CreativeAssetRecord } from "./assetStore";
import { loadCreativeAssetBytes } from "./assetStore";
import { getCreativeBlobStore } from "./blobStore";
import { isVideoCreativeMimeType } from "./assets";

export type CreativePublishBufferedMedia = {
  readonly mode: "buffer";
  readonly mimeType: string;
  readonly byteSize: number;
  readonly bytes: Uint8Array;
  readonly assetId: string;
};

export type CreativePublishStreamMedia = {
  readonly mode: "stream";
  readonly mimeType: string;
  readonly byteSize: number;
  readonly stream: ReadableStream<Uint8Array>;
  readonly assetId: string;
};

export type CreativePublishLoadedMedia =
  | CreativePublishBufferedMedia
  | CreativePublishStreamMedia;

export async function loadCreativeAssetMedia(
  record: CreativeAssetRecord,
): Promise<CreativePublishLoadedMedia> {
  if (record.storageBackend === "inline_bytea") {
    const bytes = await loadCreativeAssetBytes(record);
    return {
      mode: "buffer",
      mimeType: record.mimeType,
      byteSize: record.byteSize,
      bytes,
      assetId: record.id,
    };
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

  if (isVideoCreativeMimeType(record.mimeType)) {
    try {
      const stream = await blobStore.getObjectStream(record.objectKey);
      return {
        mode: "stream",
        mimeType: record.mimeType,
        byteSize: record.byteSize,
        stream,
        assetId: record.id,
      };
    } catch {
      throw new PersistenceError("persistence", "Failed to load creative asset stream", {
        details: [{ field: "objectKey", message: "storage_stream_failed" }],
      });
    }
  }

  const bytes = await loadCreativeAssetBytes(record);
  return {
    mode: "buffer",
    mimeType: record.mimeType,
    byteSize: record.byteSize,
    bytes,
    assetId: record.id,
  };
}
