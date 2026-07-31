/**
 * Performance helpers — lazy loading, dynamic import wrappers, caching.
 */

export {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheInvalidateByTag,
  cacheClear,
  cachePeek,
  isStale,
  queryFetch,
  serializeQueryKey,
  subscribeCache,
  CacheTags,
  type CacheEntry,
  type QueryKey,
  type QueryOptions,
} from "./cache";

/**
 * Named dynamic import helper for route-level code splitting.
 * Usage: const Mod = await loadChunk(() => import("./HeavyModule"));
 */
export async function loadChunk<T>(
  importer: () => Promise<T>,
): Promise<T> {
  return importer();
}

/** Prefetch a chunk without awaiting (fire-and-forget). */
export function prefetchChunk(importer: () => Promise<unknown>): void {
  void importer().catch(() => {
    /* ignore prefetch failures */
  });
}
