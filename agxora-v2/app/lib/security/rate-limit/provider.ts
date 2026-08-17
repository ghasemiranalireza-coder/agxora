/**
 * Phase 46-B — resolve active rate-limit store from env.
 *
 * Priority:
 * 1. test override (setRateLimitStoreForTests)
 * 2. explicit http store when URL is configured
 * 3. memory store (default)
 *
 * http without URL → fail-closed misconfigured store (no silent memory fallback).
 */

import "server-only";

import { getRateLimitStoreConfig } from "./config";
import {
  getMemoryRateLimitStore,
  resetMemoryRateLimitStore,
} from "./memoryStore";
import { createHttpRateLimitStore } from "./providers/http";
import type { RateLimitDecisionBase, RateLimitStore } from "./types";

let testStore: RateLimitStore | null = null;
let httpStore: RateLimitStore | null = null;
let httpStoreKey = "";

const misconfiguredHttpStore: RateLimitStore = {
  async consume(): Promise<RateLimitDecisionBase> {
    throw new Error("rate_limit_store_misconfigured");
  },
  reset() {},
  size() {
    return 0;
  },
};

/** Test-only store injection — highest priority override. */
export function setRateLimitStoreForTests(store: RateLimitStore | null): void {
  testStore = store;
  if (!store) {
    resetMemoryRateLimitStore();
    httpStore = null;
    httpStoreKey = "";
  }
}

function getSharedHttpStore(): RateLimitStore {
  const config = getRateLimitStoreConfig();
  const key = `${config.httpUrl}:${config.httpToken ?? ""}:${config.httpTimeoutMs}`;
  if (!httpStore || httpStoreKey !== key) {
    httpStore = createHttpRateLimitStore(config);
    httpStoreKey = key;
  }
  return httpStore;
}

export function getRateLimitStore(maxKeys: number): RateLimitStore {
  if (testStore) return testStore;

  const config = getRateLimitStoreConfig();
  if (config.store === "http") {
    if (!config.httpUrl) return misconfiguredHttpStore;
    return getSharedHttpStore();
  }

  return getMemoryRateLimitStore(maxKeys);
}

export function resetRateLimitStore(): void {
  testStore?.reset();
  resetMemoryRateLimitStore();
}
