/**
 * Phase 46-A — server-side rate limiting types.
 */

export type RateLimitPolicyId =
  | "auth.login"
  | "auth.register"
  | "auth.forgot_password"
  | "auth.reset_password"
  | "auth.verify_email"
  | "auth.request_verification"
  | "control.invite"
  | "control.ownership_transfer_initiate"
  | "control.ownership_transfer_confirm"
  | "agents.creative_generate"
  | "agents.creative_publish"
  | "agents.creative_publish_status"
  | "agents.social_connect"
  | "ai.chat";

export type RateLimitKeyKind = "ip" | "user" | "ip_user";

export type RateLimitPolicy = {
  readonly id: RateLimitPolicyId;
  readonly max: number;
  readonly windowMs: number;
  readonly keyKind: RateLimitKeyKind;
  /** Fail closed when the store cannot record (auth/abuse sensitive). */
  readonly failClosed: boolean;
};

export type RateLimitDecision = {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly retryAfterSec: number;
  readonly key: string;
  readonly policyId: RateLimitPolicyId;
};

export type RateLimitStore = {
  /** Consume one attempt; returns decision after increment when allowed. */
  consume(input: {
    readonly key: string;
    readonly max: number;
    readonly windowMs: number;
    readonly now?: number;
  }): Promise<RateLimitDecisionBase>;
  reset(key?: string): void;
  size(): number;
};

export type RateLimitDecisionBase = {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly retryAfterSec: number;
};
