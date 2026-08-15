/**
 * Phase 46-A — rate-limit enforcement.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import { resolveClientIpKey } from "./clientIp";
import { getRateLimitPolicy, getRateLimitRuntimeConfig } from "./config";
import { getActiveRateLimitStore } from "./memoryStore";
import type { RateLimitDecision, RateLimitPolicyId } from "./types";

export type EnforceRateLimitInput = {
  readonly request: Request;
  readonly policyId: RateLimitPolicyId;
  /** Required for user / ip_user key kinds. */
  readonly userId?: string | null;
};

function buildKey(
  policyId: RateLimitPolicyId,
  keyKind: "ip" | "user" | "ip_user",
  ip: string,
  userId?: string | null,
): string {
  if (keyKind === "ip") {
    return `${policyId}:ip:${ip}`;
  }
  if (keyKind === "user") {
    if (!userId) {
      throw new PersistenceError("unauthorized", "Authentication required");
    }
    return `${policyId}:user:${userId}`;
  }
  if (!userId) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  return `${policyId}:ip_user:${ip}:${userId}`;
}

/**
 * Consume one attempt against the policy bucket.
 * Throws PersistenceError(rate_limited) when denied.
 * Auth/control policies fail closed on store capacity errors.
 */
export function enforceRateLimit(input: EnforceRateLimitInput): RateLimitDecision {
  const runtime = getRateLimitRuntimeConfig();
  const policy = getRateLimitPolicy(input.policyId);

  if (!runtime.enabled) {
    return {
      allowed: true,
      remaining: policy.max,
      limit: policy.max,
      retryAfterSec: 0,
      key: "disabled",
      policyId: policy.id,
    };
  }

  const ip = resolveClientIpKey(input.request);
  const key = buildKey(policy.id, policy.keyKind, ip, input.userId);
  const store = getActiveRateLimitStore(runtime.maxKeys);

  try {
    const decision = store.consume({
      key,
      max: policy.max,
      windowMs: policy.windowMs,
    });

    if (!decision.allowed) {
      throw new PersistenceError("rate_limited", "Too many requests. Try again later.", {
        status: 429,
        details: [{ message: `retry_after_sec=${decision.retryAfterSec}` }],
      });
    }

    return {
      ...decision,
      key,
      policyId: policy.id,
    };
  } catch (error) {
    if (error instanceof PersistenceError) throw error;

    if (policy.failClosed) {
      throw new PersistenceError(
        "rate_limited",
        "Too many requests. Try again later.",
        { status: 429 },
      );
    }

    // Non-fail-closed policies would allow — Phase 46-A has none of these.
    throw error;
  }
}
