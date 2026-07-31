/**
 * Simple in-memory cache strategy for future API responses.
 * TTL + stale-while-revalidate style markers (architecture only).
 */

export type CacheEntry<T> = {
  readonly value: T;
  readonly storedAt: number;
  readonly ttlMs: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > entry.ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 60_000): void {
  store.set(key, { value, storedAt: Date.now(), ttlMs });
}

export function cacheInvalidate(prefixOrKey: string): void {
  for (const key of store.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      store.delete(key);
    }
  }
}

export function cacheClear(): void {
  store.clear();
}

export function isStale(key: string, softTtlMs: number): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  return Date.now() - entry.storedAt > softTtlMs;
}
