/**
 * Phase 46-A — server-side rate limiting surface.
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
} from "./config";

export { resolveClientIpKey, UNTRUSTED_IP_KEY } from "./clientIp";

export {
  MemoryRateLimitStore,
  getActiveRateLimitStore,
  resetRateLimitStore,
  setRateLimitStoreForTests,
} from "./memoryStore";

export { enforceRateLimit } from "./enforce";
export type { EnforceRateLimitInput } from "./enforce";

export { rateLimitResponse } from "./http";
