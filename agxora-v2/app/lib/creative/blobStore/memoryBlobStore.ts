/**
 * Phase 62.0 — in-memory blob store for tests and local dev without S3.
 */

import type { CreativeBlobHead, CreativeBlobPutInput, CreativeBlobStore } from "./types";

export function createMemoryCreativeBlobStore(): CreativeBlobStore {
  const objects = new Map<string, { bytes: Uint8Array; mimeType: string }>();

  return {
    id: "memory",
    isConfigured: () => true,
    async putObject(input: CreativeBlobPutInput): Promise<CreativeBlobHead> {
      objects.set(input.key, {
        bytes: input.bytes,
        mimeType: input.mimeType,
      });
      return { byteSize: input.bytes.byteLength, mimeType: input.mimeType };
    },
    async getObjectBytes(key: string): Promise<Uint8Array> {
      const item = objects.get(key);
      if (!item) throw new Error("blob_not_found");
      return item.bytes;
    },
    async getObjectBytesRange(key: string, offset: number, length: number): Promise<Uint8Array> {
      const item = objects.get(key);
      if (!item) throw new Error("blob_not_found");
      const end = Math.min(offset + length, item.bytes.byteLength);
      return item.bytes.subarray(offset, end);
    },
    async getObjectStream(key: string): Promise<ReadableStream<Uint8Array>> {
      const item = objects.get(key);
      if (!item) throw new Error("blob_not_found");
      return new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(item.bytes);
          controller.close();
        },
      });
    },
    async deleteObject(key: string): Promise<void> {
      objects.delete(key);
    },
    async headObject(key: string): Promise<CreativeBlobHead | null> {
      const item = objects.get(key);
      if (!item) return null;
      return { byteSize: item.bytes.byteLength, mimeType: item.mimeType };
    },
  };
}
