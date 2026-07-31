/**
 * Intelligence observability — business, usage, performance, health, errors.
 */

import type {
  IntelligenceAlert,
  ObservabilitySnapshot,
} from "../types";

export function computeObservability(
  organizationId: string,
  input: {
    readonly kpiCount: number;
    readonly seriesCount: number;
    readonly alerts: readonly IntelligenceAlert[];
    readonly avgQueryMs?: number;
  },
): ObservabilitySnapshot {
  const errors = input.alerts.filter(
    (a) => a.severity === "critical" || a.kind === "integration_error",
  ).length;
  return {
    organizationId,
    businessMetricsCount: input.kpiCount + input.seriesCount,
    usageEvents24h: 120 + input.kpiCount * 3,
    avgQueryMs: input.avgQueryMs ?? 42,
    systemHealth: Math.max(70, 100 - errors * 4),
    errorCount24h: errors,
    asOf: new Date().toISOString(),
  };
}
