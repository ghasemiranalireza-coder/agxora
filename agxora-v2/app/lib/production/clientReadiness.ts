/**
 * Phase 57.1 — client-safe production readiness via /api/health.
 * Does not read server-only environment variables.
 */

import type { FirstCustomerGateIssueCode } from "./firstCustomerGate";

export type ClientProductionReadiness = {
  readonly enforced: boolean;
  readonly ready: boolean;
  readonly issueCodes: readonly FirstCustomerGateIssueCode[];
};

export type HealthProductionGatePayload = {
  readonly enforced?: boolean;
  readonly ready?: boolean;
  readonly issueCodes?: readonly FirstCustomerGateIssueCode[];
};

export type HealthReadinessResponse = {
  readonly productionGate?: HealthProductionGatePayload;
};

export function parseProductionReadinessFromHealth(
  body: HealthReadinessResponse,
): ClientProductionReadiness {
  const gate = body.productionGate;
  return {
    enforced: gate?.enforced === true,
    ready: gate?.ready !== false,
    issueCodes: Array.isArray(gate?.issueCodes) ? gate.issueCodes : [],
  };
}

/** Fetch public-safe readiness from the server health endpoint. */
export async function fetchProductionReadinessFromHealth(
  fetchImpl: typeof fetch = globalThis.fetch,
  apiPath = "/api/health",
): Promise<ClientProductionReadiness> {
  const response = await fetchImpl(apiPath, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`production_readiness_health_${response.status}`);
  }
  const body = (await response.json()) as HealthReadinessResponse;
  return parseProductionReadinessFromHealth(body);
}
