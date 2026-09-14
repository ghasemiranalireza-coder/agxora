import { randomUUID } from "node:crypto";
import type { GuardianObservation } from "../types";
import { redactEvidence, guardianRedact } from "../redact";

export const DEFAULT_HEALTH_URL = "https://agxora.de/api/health";

export type HealthObserverDeps = {
  readonly fetchImpl?: typeof fetch;
  readonly url?: string;
  readonly now?: () => Date;
};

export async function observeProductionHealth(
  deps: HealthObserverDeps = {},
): Promise<readonly GuardianObservation[]> {
  const url = deps.url ?? DEFAULT_HEALTH_URL;
  const now = deps.now ?? (() => new Date());
  const fetchImpl = deps.fetchImpl ?? fetch;
  const started = Date.now();
  let status = 0;
  let payload: Record<string, unknown> = {};
  try {
    const response = await fetchImpl(url, { method: "GET" });
    status = response.status;
    const text = await response.text();
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { parseError: true };
    }
  } catch (error) {
    return [
      {
        id: `gobs_${randomUUID()}`,
        source: "production",
        timestamp: now().toISOString(),
        severity: "critical",
        category: "production_health",
        title: "Production health endpoint unreachable",
        evidence: redactEvidence(
          error instanceof Error ? error.message : "health_unreachable",
        ),
        reference: url,
        details: guardianRedact({ latencyMs: Date.now() - started, method: "GET" }),
      },
    ];
  }

  const latencyMs = Date.now() - started;
  const ok = payload.ok === true && status === 200;
  const runtimeStatus = typeof payload.status === "string" ? payload.status : "unknown";
  const version = typeof payload.version === "string" ? payload.version : null;
  const runtime = typeof payload.runtime === "string" ? payload.runtime : null;
  const severity =
    !ok || status >= 500
      ? "critical"
      : runtimeStatus === "not_ready"
        ? "medium"
        : runtimeStatus === "degraded"
          ? "low"
          : "info";

  return [
    {
      id: `gobs_${randomUUID()}`,
      source: "production",
      timestamp: now().toISOString(),
      severity,
      category: "production_health",
      title: ok
        ? `Production health HTTP ${status} (${runtimeStatus})`
        : `Production health failed HTTP ${status}`,
      evidence: `http=${status} ok=${String(ok)} status=${runtimeStatus}`,
      reference: url,
      details: guardianRedact({
        latencyMs,
        version,
        runtime,
        httpStatus: status,
        healthOk: ok,
        healthStatus: runtimeStatus,
      }),
    },
  ];
}
