/**
 * Simple in-process rate limiter for AI providers.
 */

export interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterMs?: number;
}

export class AIRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly config: RateLimitConfig = {
      maxRequests: 60,
      windowMs: 60_000,
    },
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - this.config.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((ts) => ts > windowStart);

    if (recent.length >= this.config.maxRequests) {
      const oldest = recent[0] ?? now;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, oldest + this.config.windowMs - now),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      remaining: this.config.maxRequests - recent.length,
    };
  }

  reset(key?: string): void {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }
}

export const defaultRateLimiter = new AIRateLimiter();
