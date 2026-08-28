/**
 * Health check payload — liveness / readiness architecture.
 * Phase 57: exposes first-customer production gate readiness (no secrets).
 */

import { assertProdEnv, getEnvSnapshot } from "./env";
import {
  collectFirstCustomerModeSnapshot,
  evaluateFirstCustomerProductionGate,
  type FirstCustomerGateIssueCode,
} from "./firstCustomerGate";
import {
  evaluateYouTubePublishReadiness,
  type PublishReadinessIssueCode,
} from "@/app/lib/social/publishReadiness";

export interface HealthPayload {
  readonly ok: boolean;
  readonly status: "healthy" | "degraded" | "not_ready";
  readonly service: "agxora";
  readonly version: string;
  readonly runtime: string;
  readonly authRequired: boolean;
  readonly mocksEnabled: boolean;
  readonly warnings: readonly string[];
  readonly checkedAt: string;
  /** Phase 57 — first-customer production gate (public-safe). */
  readonly productionGate: {
    readonly enforced: boolean;
    readonly ready: boolean;
    readonly authMode: string;
    readonly crmPersistence: string;
    readonly agentOsPersistence: string;
    readonly emailConfigured: boolean;
    readonly issueCodes: readonly FirstCustomerGateIssueCode[];
  };
  /** Phase 64 — YouTube publish readiness (public-safe, no secrets). */
  readonly publishReadiness: {
    readonly enabled: boolean;
    readonly ready: boolean;
    readonly issueCodes: readonly PublishReadinessIssueCode[];
  };
}

export function buildHealthPayload(): HealthPayload {
  const env = getEnvSnapshot();
  const warnings = [...assertProdEnv()];
  const gate = evaluateFirstCustomerProductionGate(
    collectFirstCustomerModeSnapshot({
      runtime: env.runtime,
      nodeEnv: env.nodeEnv,
      authRequired: env.authRequired,
      useMocks: env.useMocks,
    }),
  );

  const productionBlocked = gate.enforced && !gate.ready;
  const publishReadiness = evaluateYouTubePublishReadiness();
  const publishBlocked = publishReadiness.enabled && !publishReadiness.ready;
  const degraded =
    warnings.length > 0 &&
    (env.nodeEnv === "production" || env.runtime === "production");

  return {
    // Liveness remains ok:true so load balancers do not kill the process;
    // readiness is expressed via status + productionGate.ready.
    ok: true,
    status:
      productionBlocked || publishBlocked ? "not_ready" : degraded ? "degraded" : "healthy",
    service: "agxora",
    version: env.appVersion,
    runtime: env.runtime,
    authRequired: env.authRequired,
    mocksEnabled: env.useMocks,
    warnings,
    checkedAt: new Date().toISOString(),
    productionGate: {
      enforced: gate.enforced,
      ready: gate.ready,
      authMode: gate.snapshot.authMode,
      crmPersistence: gate.snapshot.crmPersistence,
      agentOsPersistence: gate.snapshot.agentOsPersistence,
      emailConfigured: gate.snapshot.emailProvider !== "none",
      issueCodes: gate.issues.map((issue) => issue.code),
    },
    publishReadiness: {
      enabled: publishReadiness.enabled,
      ready: publishReadiness.ready,
      issueCodes: publishReadiness.issues.map((issue) => issue.code),
    },
  };
}
