/**
 * Phase 57.1 / 64.0 — client-safe production readiness via /api/health.
 * Does not read server-only environment variables.
 */

import type { FirstCustomerGateIssueCode } from "./firstCustomerGate";
import type { PublishReadinessIssueCode } from "@/app/lib/social/publishReadiness";

export type ClientProductionReadiness = {
  readonly enforced: boolean;
  readonly ready: boolean;
  readonly issueCodes: readonly string[];
  readonly publishEnabled: boolean;
  readonly publishReady: boolean;
  readonly publishIssueCodes: readonly PublishReadinessIssueCode[];
};

export type HealthProductionGatePayload = {
  readonly enforced?: boolean;
  readonly ready?: boolean;
  readonly issueCodes?: readonly FirstCustomerGateIssueCode[];
};

export type HealthPublishReadinessPayload = {
  readonly enabled?: boolean;
  readonly ready?: boolean;
  readonly issueCodes?: readonly PublishReadinessIssueCode[];
};

export type HealthReadinessResponse = {
  readonly productionGate?: HealthProductionGatePayload;
  readonly publishReadiness?: HealthPublishReadinessPayload;
};

export function parseProductionReadinessFromHealth(
  body: HealthReadinessResponse,
): ClientProductionReadiness {
  const gate = body.productionGate;
  const publish = body.publishReadiness;
  const gateIssueCodes = Array.isArray(gate?.issueCodes) ? gate.issueCodes : [];
  const publishIssueCodes = Array.isArray(publish?.issueCodes) ? publish.issueCodes : [];
  const publishEnabled = publish?.enabled === true;
  const publishReady = publish?.ready !== false;
  const gateReady = gate?.ready !== false;
  const combinedReady = gateReady && (!publishEnabled || publishReady);

  return {
    enforced: gate?.enforced === true,
    ready: combinedReady,
    issueCodes: [
      ...gateIssueCodes,
      ...(publishEnabled && !publishReady ? publishIssueCodes : []),
    ],
    publishEnabled,
    publishReady,
    publishIssueCodes,
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
