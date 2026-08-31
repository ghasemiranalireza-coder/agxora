/**
 * Phase 46-A — rate-limit policies and env configuration.
 * Server-only. No NEXT_PUBLIC_* secrets.
 */

import "server-only";

import type { RateLimitPolicy, RateLimitPolicyId } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Default policies — tunable via env overrides below. */
export const RATE_LIMIT_POLICIES: Record<RateLimitPolicyId, RateLimitPolicy> = {
  "auth.login": {
    id: "auth.login",
    max: 20,
    windowMs: 15 * MINUTE,
    keyKind: "ip",
    failClosed: true,
  },
  "auth.register": {
    id: "auth.register",
    max: 10,
    windowMs: HOUR,
    keyKind: "ip",
    failClosed: true,
  },
  "auth.forgot_password": {
    id: "auth.forgot_password",
    max: 5,
    windowMs: HOUR,
    keyKind: "ip",
    failClosed: true,
  },
  "auth.reset_password": {
    id: "auth.reset_password",
    max: 10,
    windowMs: HOUR,
    keyKind: "ip",
    failClosed: true,
  },
  "auth.verify_email": {
    id: "auth.verify_email",
    max: 20,
    windowMs: HOUR,
    keyKind: "ip",
    failClosed: true,
  },
  "auth.request_verification": {
    id: "auth.request_verification",
    max: 5,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
  "control.invite": {
    id: "control.invite",
    max: 30,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
  "control.ownership_transfer_initiate": {
    id: "control.ownership_transfer_initiate",
    max: 5,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
  "control.ownership_transfer_confirm": {
    id: "control.ownership_transfer_confirm",
    max: 10,
    windowMs: HOUR,
    keyKind: "ip_user",
    failClosed: true,
  },
  /** Phase 59.1 — expensive image generation; conservative per-user budget. */
  "agents.creative_generate": {
    id: "agents.creative_generate",
    max: 10,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
  /** Phase 63.0 — external publish side effects; conservative per-user budget. */
  "agents.creative_publish": {
    id: "agents.creative_publish",
    max: 10,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
  /** Phase 65.0 — publish status polling. */
  "agents.creative_publish_status": {
    id: "agents.creative_publish_status",
    max: 60,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
  /** Phase 63.1 — social OAuth connect/disconnect. */
  "agents.social_connect": {
    id: "agents.social_connect",
    max: 20,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
  /** Authenticated OpenAI chat — per-user budget, fail closed. */
  "ai.chat": {
    id: "ai.chat",
    max: 60,
    windowMs: HOUR,
    keyKind: "user",
    failClosed: true,
  },
};

export type RateLimitStoreId = "memory" | "http";

export type RateLimitStoreConfig = {
  readonly store: RateLimitStoreId;
  readonly httpUrl: string | null;
  readonly httpToken: string | null;
  readonly httpTimeoutMs: number;
};

export type RateLimitRuntimeConfig = {
  /** Master switch — when false, all checks allow. */
  readonly enabled: boolean;
  /**
   * When true, trust X-Forwarded-For / X-Real-IP from the edge proxy.
   * Production deployments behind a reverse proxy MUST set this.
   */
  readonly trustProxy: boolean;
  /** Max distinct keys retained in the in-memory store. */
  readonly maxKeys: number;
};

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Defaults: enabled in all environments (tests reset the store).
 * Trust proxy defaults off — spoofing-safe until the operator opts in.
 */
export function getRateLimitRuntimeConfig(): RateLimitRuntimeConfig {
  return {
    enabled: envFlag("AGXORA_RATE_LIMIT_ENABLED", true),
    trustProxy: envFlag("AGXORA_TRUST_PROXY", false),
    maxKeys: envInt("AGXORA_RATE_LIMIT_MAX_KEYS", 10_000),
  };
}

function parseStoreId(raw: string | undefined): RateLimitStoreId {
  const value = (raw ?? "memory").trim().toLowerCase();
  return value === "http" ? "http" : "memory";
}

/** Shared store selection — defaults to memory unless explicitly set to http. */
export function getRateLimitStoreConfig(): RateLimitStoreConfig {
  return {
    store: parseStoreId(process.env.AGXORA_RATE_LIMIT_STORE),
    httpUrl: process.env.AGXORA_RATE_LIMIT_HTTP_URL?.trim() || null,
    httpToken: process.env.AGXORA_RATE_LIMIT_HTTP_TOKEN?.trim() || null,
    httpTimeoutMs: envInt("AGXORA_RATE_LIMIT_HTTP_TIMEOUT_MS", 2_500),
  };
}

export function getRateLimitPolicy(id: RateLimitPolicyId): RateLimitPolicy {
  const base = RATE_LIMIT_POLICIES[id];
  const maxOverride = envInt(
    `AGXORA_RATE_LIMIT_${id.replace(/\./g, "_").toUpperCase()}_MAX`,
    base.max,
  );
  const windowOverride = envInt(
    `AGXORA_RATE_LIMIT_${id.replace(/\./g, "_").toUpperCase()}_WINDOW_MS`,
    base.windowMs,
  );
  return {
    ...base,
    max: maxOverride,
    windowMs: windowOverride,
  };
}
