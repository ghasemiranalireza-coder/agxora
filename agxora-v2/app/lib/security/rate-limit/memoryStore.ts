/**
 * Phase 46-A — in-memory sliding-window store.
 *
 * Deployment limitation: process-local only. Multiple Node instances do not
 * share counters. Do not claim horizontal consistency without a shared store.
 */

import type { RateLimitDecisionBase, RateLimitStore } from "./types";

type Bucket = number[];

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(readonly maxKeys: number) {}

  consume(input: {
    readonly key: string;
    readonly max: number;
    readonly windowMs: number;
    readonly now?: number;
  }): RateLimitDecisionBase {
    const now = input.now ?? Date.now();
    const windowStart = now - input.windowMs;
    const existing = this.buckets.get(input.key) ?? [];
    const recent = existing.filter((ts) => ts > windowStart);

    if (recent.length >= input.max) {
      this.buckets.set(input.key, recent);
      const oldest = recent[0] ?? now;
      const retryAfterMs = Math.max(0, oldest + input.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        limit: input.max,
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    if (!this.buckets.has(input.key) && this.buckets.size >= this.maxKeys) {
      this.evictStale(now, input.windowMs);
      if (this.buckets.size >= this.maxKeys) {
        throw new Error("rate_limit_store_capacity_exceeded");
      }
    }

    recent.push(now);
    this.buckets.set(input.key, recent);
    return {
      allowed: true,
      remaining: Math.max(0, input.max - recent.length),
      limit: input.max,
      retryAfterSec: 0,
    };
  }

  reset(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }

  size(): number {
    return this.buckets.size;
  }

  private evictStale(now: number, windowMs: number): void {
    const cutoff = now - windowMs;
    for (const [key, stamps] of this.buckets) {
      const kept = stamps.filter((ts) => ts > cutoff);
      if (kept.length === 0) this.buckets.delete(key);
      else this.buckets.set(key, kept);
    }
  }
}

let sharedStore: MemoryRateLimitStore | null = null;
let sharedMaxKeys = 0;
let testStore: RateLimitStore | null = null;

export function getMemoryRateLimitStore(maxKeys: number): MemoryRateLimitStore {
  if (!sharedStore || sharedMaxKeys !== maxKeys) {
    sharedStore = new MemoryRateLimitStore(maxKeys);
    sharedMaxKeys = maxKeys;
  }
  return sharedStore;
}

/** Vitest / unit tests — inject a fresh store. */
export function setRateLimitStoreForTests(store: RateLimitStore | null): void {
  testStore = store;
  if (!store) {
    sharedStore = null;
  }
}

export function getActiveRateLimitStore(maxKeys: number): RateLimitStore {
  if (testStore) return testStore;
  return getMemoryRateLimitStore(maxKeys);
}

export function resetRateLimitStore(): void {
  testStore?.reset();
  sharedStore?.reset();
}
