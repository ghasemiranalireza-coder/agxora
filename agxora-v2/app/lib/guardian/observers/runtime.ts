import { randomUUID } from "node:crypto";
import type { GuardianObservation } from "../types";
import { redactEvidence } from "../redact";

export type RuntimeSignal = {
  readonly source: string;
  readonly route?: string;
  readonly timestamp: string;
  readonly status?: number;
  readonly fingerprint: string;
  readonly frequency?: number;
  readonly message?: string;
};

export type RuntimeErrorAdapter = {
  readonly configured: boolean;
  readonly listSignals: () => Promise<readonly RuntimeSignal[]> | readonly RuntimeSignal[];
};

export function createUnconfiguredRuntimeAdapter(): RuntimeErrorAdapter {
  return {
    configured: false,
    listSignals: () => [],
  };
}

export async function observeRuntimeErrors(
  adapter: RuntimeErrorAdapter = createUnconfiguredRuntimeAdapter(),
  now: () => Date = () => new Date(),
): Promise<readonly GuardianObservation[]> {
  if (!adapter.configured) {
    return [
      {
        id: `gobs_${randomUUID()}`,
        source: "runtime",
        timestamp: now().toISOString(),
        severity: "info",
        category: "runtime_error",
        title: "Runtime error stream is not configured",
        evidence: "no_runtime_adapter",
        reference: "guardian.runtime",
        details: { configured: false, invented: false },
      },
    ];
  }
  const signals = await adapter.listSignals();
  return signals.map((signal) => ({
    id: `gobs_${randomUUID()}`,
    source: "runtime" as const,
    timestamp: signal.timestamp,
    severity: (signal.status ?? 0) >= 500 ? ("high" as const) : ("medium" as const),
    category: "runtime_error" as const,
    title: `Runtime signal ${signal.fingerprint}`,
    evidence: redactEvidence(signal.message ?? signal.fingerprint),
    reference: signal.route,
    details: {
      source: signal.source,
      status: signal.status ?? null,
      frequency: signal.frequency ?? 1,
      fingerprint: signal.fingerprint,
    },
  }));
}
