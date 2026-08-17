/**
 * Phase 46-A / 46-B — server-side rate limiting surface.
 */

import "server-only";

export type {
  RateLimitDecision,
  RateLimitKeyKind,
  RateLimitPolicy,
  RateLimitPolicyId,
  RateLimitStore,
} from "./types";

export {
  RATE_LIMIT_POLICIES,
  getRateLimitPolicy,
  getRateLimitRuntimeConfig,
  getRateLimitStoreConfig,
} from "./config";
export type { RateLimitStoreConfig, RateLimitStoreId } from "./config";

export { resolveClientIpKey, UNTRUSTED_IP_KEY } from "./clientIp";

export { MemoryRateLimitStore } from "./memoryStore";
export {
  getRateLimitStore,
  resetRateLimitStore,
  setRateLimitStoreForTests,
} from "./provider";

export { parseHttpRateLimitResponse } from "./providers/http";

export { enforceRateLimit } from "./enforce";
export type { EnforceRateLimitInput } from "./enforce";

export { rateLimitResponse } from "./http";
