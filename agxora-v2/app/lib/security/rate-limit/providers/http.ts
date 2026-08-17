/**
 * Phase 46-B — HTTP shared rate-limit store (fetch-based, no extra dependencies).
 *
 * POSTs JSON to AGXORA_RATE_LIMIT_HTTP_URL. Optional bearer AGXORA_RATE_LIMIT_HTTP_TOKEN.
 * The downstream worker owns Redis/Upstash/shared counter integration.
 */

import "server-only";

import type { RateLimitStoreConfig } from "../config";
import type { RateLimitDecisionBase, RateLimitStore } from "../types";

function safeNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const n = Math.trunc(value);
  return n >= 0 ? n : fallback;
}

export function parseHttpRateLimitResponse(
  payload: unknown,
  fallbackLimit: number,
): RateLimitDecisionBase {
  if (!payload || typeof payload !== "object") {
    throw new Error("rate_limit_http_invalid_response");
  }

  const obj = payload as Record<string, unknown>;
  if (typeof obj.allowed !== "boolean") {
    throw new Error("rate_limit_http_invalid_response");
  }

  const limit = safeNonNegativeInt(obj.limit, fallbackLimit);
  const remaining = safeNonNegativeInt(
    obj.remaining,
    obj.allowed ? Math.max(0, limit - 1) : 0,
  );
  const retryAfterSec = safeNonNegativeInt(obj.retryAfterSec, obj.allowed ? 0 : 60);

  return {
    allowed: obj.allowed,
    remaining: obj.allowed ? remaining : 0,
    limit,
    retryAfterSec: obj.allowed ? 0 : Math.max(1, retryAfterSec),
  };
}

export function createHttpRateLimitStore(config: RateLimitStoreConfig): RateLimitStore {
  const url = config.httpUrl;
  if (!url) {
    throw new Error("rate_limit_store_misconfigured");
  }

  return {
    async consume(input): Promise<RateLimitDecisionBase> {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json",
      };
      if (config.httpToken) {
        headers.authorization = `Bearer ${config.httpToken}`;
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            key: input.key,
            max: input.max,
            windowMs: input.windowMs,
            now: input.now ?? Date.now(),
          }),
          signal: AbortSignal.timeout(config.httpTimeoutMs),
        });

        if (!response.ok) {
          throw new Error(`rate_limit_http_status_${response.status}`);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("rate_limit_http_invalid_response");
        }

        const payload = await response.json().catch(() => {
          throw new Error("rate_limit_http_invalid_response");
        });

        return parseHttpRateLimitResponse(payload, input.max);
      } catch (error) {
        console.error("[agxora.rate-limit] shared store handoff failed", {
          store: "http",
        });
        throw error instanceof Error ? error : new Error("rate_limit_http_failed");
      }
    },
    reset() {},
    size() {
      return 0;
    },
  };
}
