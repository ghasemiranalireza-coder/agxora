/**
 * Liveness and readiness payloads.
 * Liveness never depends on DB / email / auth config.
 */

import { assertProdEnv, getEnvSnapshot, isProductionRuntime } from "./env";

export interface LivenessPayload {
  readonly ok: true;
  readonly status: "alive";
  readonly service: "agxora";
  readonly version: string;
  readonly checkedAt: string;
}

export interface ReadinessPayload {
  readonly ok: boolean;
  readonly status: "ready" | "not_ready";
  readonly service: "agxora";
  readonly version: string;
  readonly runtime: string;
  readonly authRequired: boolean;
  readonly mocksEnabled: boolean;
  readonly issues: readonly string[];
  readonly database: "ok" | "unavailable" | "skipped";
  readonly checkedAt: string;
}

/** Backward-compatible alias used by older callers. */
export type HealthPayload = LivenessPayload & {
  readonly runtime?: string;
  readonly authRequired?: boolean;
  readonly mocksEnabled?: boolean;
  readonly warnings?: readonly string[];
};

export function buildLivenessPayload(): LivenessPayload {
  const env = getEnvSnapshot();
  return {
    ok: true,
    status: "alive",
    service: "agxora",
    version: env.appVersion,
    checkedAt: new Date().toISOString(),
  };
}

/** @deprecated Use buildLivenessPayload — /api/health is liveness-only. */
export function buildHealthPayload(): LivenessPayload {
  return buildLivenessPayload();
}

export async function pingDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  try {
    const { prisma } = await import("@/app/lib/db/prisma");
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function buildReadinessPayload(): Promise<ReadinessPayload> {
  const env = getEnvSnapshot();
  const issues = [...assertProdEnv()];
  const production = isProductionRuntime();

  let database: ReadinessPayload["database"] = "skipped";
  if (process.env.DATABASE_URL?.trim()) {
    const ok = await pingDatabase();
    database = ok ? "ok" : "unavailable";
    if (!ok) issues.push("database unavailable");
  } else if (production) {
    database = "unavailable";
    if (!issues.includes("DATABASE_URL must be set in production")) {
      issues.push("DATABASE_URL must be set in production");
    }
  }

  const ok = issues.length === 0;
  return {
    ok,
    status: ok ? "ready" : "not_ready",
    service: "agxora",
    version: env.appVersion,
    runtime: env.runtime,
    authRequired: env.authRequired,
    mocksEnabled: env.useMocks,
    issues,
    database,
    checkedAt: new Date().toISOString(),
  };
}
