/**
 * Enhanced cache + query client — React Query–ready architecture.
 */

export type CacheEntry<T> = {
  readonly value: T;
  readonly storedAt: number;
  readonly ttlMs: number;
  readonly tags: readonly string[];
};

export type QueryKey = readonly unknown[];

export interface QueryOptions {
  readonly ttlMs?: number;
  readonly tags?: readonly string[];
  readonly staleWhileRevalidate?: boolean;
}

type Listener = () => void;

const store = new Map<string, CacheEntry<unknown>>();
const listeners = new Set<Listener>();
const inflight = new Map<string, Promise<unknown>>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function serializeQueryKey(key: QueryKey): string {
  return JSON.stringify(key);
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > entry.ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cachePeek<T>(key: string): CacheEntry<T> | null {
  const entry = store.get(key);
  return entry ? (entry as CacheEntry<T>) : null;
}

export function cacheSet<T>(
  key: string,
  value: T,
  ttlMs = 60_000,
  tags: readonly string[] = [],
): void {
  store.set(key, { value, storedAt: Date.now(), ttlMs, tags });
  emit();
}

export function cacheInvalidate(prefixOrKey: string): void {
  for (const key of store.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      store.delete(key);
    }
  }
  emit();
}

export function cacheInvalidateByTag(tag: string): void {
  for (const [key, entry] of store.entries()) {
    if (entry.tags.includes(tag)) store.delete(key);
  }
  emit();
}

export function cacheClear(): void {
  store.clear();
  emit();
}

export function isStale(key: string, softTtlMs: number): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  return Date.now() - entry.storedAt > softTtlMs;
}

/**
 * Deduped fetch-through-cache — mirrors React Query fetchQuery semantics.
 */
export async function queryFetch<T>(
  key: QueryKey,
  fetcher: () => Promise<T>,
  options: QueryOptions = {},
): Promise<T> {
  const serialized = serializeQueryKey(key);
  const ttlMs = options.ttlMs ?? 60_000;
  const cached = cacheGet<T>(serialized);
  if (cached !== null) {
    if (options.staleWhileRevalidate && isStale(serialized, ttlMs / 2)) {
      void fetcher()
        .then((value) =>
          cacheSet(serialized, value, ttlMs, options.tags ?? []),
        )
        .catch(() => undefined);
    }
    return cached;
  }

  const pending = inflight.get(serialized);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((value) => {
      cacheSet(serialized, value, ttlMs, options.tags ?? []);
      return value;
    })
    .finally(() => {
      inflight.delete(serialized);
    });
  inflight.set(serialized, promise);
  return promise;
}

export function subscribeCache(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Invalidation strategy helpers for repositories. */
export const CacheTags = {
  crm: "crm",
  projects: "projects",
  finance: "finance",
  documents: "documents",
  ai: "ai",
  identity: "identity",
} as const;
