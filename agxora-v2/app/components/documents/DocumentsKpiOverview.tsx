"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { DocumentsKpi } from "../../lib/documents";
import { formatBytesLocalized } from "../../lib/documents";
import { formatNumber, formatPercent, useLocale } from "../../lib/i18n";
import { Card } from "../ui";

function displayMetricValue(
  metric: DocumentsKpi,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (metric.valueBytes != null) {
    return formatBytesLocalized(metric.valueBytes, t);
  }
  if (typeof metric.value === "number") {
    return formatNumber(metric.value);
  }
  return metric.value;
}

function displayDelta(
  metric: DocumentsKpi,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  const delta = metric.delta;
  if (!delta) return null;
  return t(`documents.kpi.${metric.id}.delta`, {
    count:
      delta.count != null
        ? formatNumber(delta.count, undefined, { maximumFractionDigits: 0 })
        : "",
    size:
      delta.sizeBytes != null ? formatBytesLocalized(delta.sizeBytes, t) : "",
    percent:
      delta.percent != null ? formatPercent(delta.percent) : "",
  });
}

export function DocumentsKpiOverview({
  metrics,
}: {
  readonly metrics: readonly DocumentsKpi[];
}): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const deltaLabel = displayDelta(metric, t);
        return (
          <motion.div
            key={metric.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.03 * index, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="h-full" padding="24px">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {t(`documents.kpi.${metric.id}.label`)}
                </h3>
                {deltaLabel && metric.delta ? (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                    style={
                      metric.delta.positive
                        ? {
                            borderColor: "rgba(52,211,153,0.28)",
                            background: "rgba(52,211,153,0.12)",
                            color: "#34d399",
                          }
                        : {
                            borderColor: "rgba(251,113,133,0.28)",
                            background: "rgba(251,113,133,0.12)",
                            color: "#fb7185",
                          }
                    }
                  >
                    {deltaLabel}
                  </span>
                ) : null}
              </div>
              <p
                className="mt-3 text-[1.5rem] font-semibold tabular-nums tracking-tight"
                style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.02em" }}
              >
                {displayMetricValue(metric, t)}
              </p>
              <p className="mt-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t(`documents.kpi.${metric.id}.caption`)}
              </p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
