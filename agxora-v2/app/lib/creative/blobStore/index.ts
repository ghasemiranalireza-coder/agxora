/**
 * Phase 62.0 — creative blob store factory.
 */

import "server-only";

import { getCreativeBlobConfig } from "./config";
import { createMemoryCreativeBlobStore } from "./memoryBlobStore";
import { createS3CompatibleCreativeBlobStore } from "./s3CompatibleBlobStore";
import type { CreativeBlobStore } from "./types";

export type { CreativeBlobStore } from "./types";
export { buildCreativeObjectKey, parseCreativeObjectKey } from "./objectKey";
export { getCreativeBlobConfig } from "./config";
export { createMemoryCreativeBlobStore } from "./memoryBlobStore";

let storeOverride: CreativeBlobStore | null = null;
let defaultStore: CreativeBlobStore | null = null;

export function getCreativeBlobStore(): CreativeBlobStore {
  if (storeOverride) return storeOverride;
  if (!defaultStore) {
    const config = getCreativeBlobConfig();
    if (config.store === "s3" && config.s3) {
      defaultStore = createS3CompatibleCreativeBlobStore(config.s3);
    } else {
      defaultStore = createMemoryCreativeBlobStore();
    }
  }
  return defaultStore;
}

/** Test-only blob store injection. */
export function setCreativeBlobStoreForTests(store: CreativeBlobStore | null): void {
  storeOverride = store;
  if (store === null) defaultStore = null;
}
