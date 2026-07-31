/**
 * Forecast framework — architecture placeholders for predictive models.
 */

import type { ForecastKind, ForecastPlaceholder } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

const KINDS: readonly {
  kind: ForecastKind;
  baseline: number;
  projected: number;
  confidence: number;
  note: string;
}[] = [
  {
    kind: "revenue",
    baseline: 482_500,
    projected: 520_000,
    confidence: 0.72,
    note: "Linear trend placeholder — replace with model service.",
  },
  {
    kind: "customer",
    baseline: 420,
    projected: 455,
    confidence: 0.68,
    note: "Acquisition + retention composite placeholder.",
  },
  {
    kind: "project",
    baseline: 12,
    projected: 14,
    confidence: 0.61,
    note: "Capacity-aware delivery forecast placeholder.",
  },
  {
    kind: "capacity",
    baseline: 78,
    projected: 82,
    confidence: 0.58,
    note: "Team utilization forecast placeholder.",
  },
  {
    kind: "growth",
    baseline: 6.9,
    projected: 8.1,
    confidence: 0.64,
    note: "Growth rate forecast placeholder.",
  },
];

export function seedForecasts(
  organizationId: string,
): readonly ForecastPlaceholder[] {
  return KINDS.map((k) => ({
    id: createId("fcst"),
    organizationId,
    kind: k.kind,
    horizonDays: 90,
    baseline: k.baseline,
    projected: k.projected,
    confidence: k.confidence,
    note: k.note,
    asOf: new Date().toISOString(),
  }));
}
