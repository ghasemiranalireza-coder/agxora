/**
 * Health check payload — liveness / readiness architecture.
 */

import { assertProdEnv, getEnvSnapshot } from "./env";

export interface HealthPayload {
  readonly ok: boolean;
  readonly status: "healthy" | "degraded";
  readonly service: "agxora";
  readonly version: string;
  readonly runtime: string;
  readonly authRequired: boolean;
  readonly mocksEnabled: boolean;
  readonly warnings: readonly string[];
  readonly checkedAt: string;
}

export function buildHealthPayload(): HealthPayload {
  const env = getEnvSnapshot();
  const warnings = assertProdEnv();
  const degraded = warnings.length > 0 && env.nodeEnv === "production";
  return {
    ok: true,
    status: degraded ? "degraded" : "healthy",
    service: "agxora",
    version: env.appVersion,
    runtime: env.runtime,
    authRequired: env.authRequired,
    mocksEnabled: env.useMocks,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}
