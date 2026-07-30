"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { FinanceOverviewMetric } from "../../lib/finance";
import { FinanceGlassCard } from "./FinancePrimitives";

function MetricIcon({ id }: { readonly id: string }): JSX.Element {
  const paths: Record<string, string> = {
    revenue: "M3 17l6-6 4 4 8-8 M14 7h6v6",
    expenses: "M12 5v14 M5 12h14",
    profit: "M4 19V5 M10 19V9 M16 19v-6 M22 19V7",
    "vat-due": "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    "open-invoices": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
    "paid-invoices": "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    cashflow: "M7 16V4m0 0L3 8m4-4l4 4 M17 8v12m0 0l4-4m-4 4l-4-4",
    "ai-score": "M12 3l2.2 4.5L19 9l-3.5 3.4L16.4 18 12 15.6 7.6 18l.9-5.6L5 9l4.8-1.5L12 3z",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[id] ?? paths.revenue} />
    </svg>
  );
}

export function FinanceOverview({
  metrics,
}: {
  readonly metrics: readonly FinanceOverviewMetric[];
}): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.id}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.04 * index,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <FinanceGlassCard className="h-full" padding="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))",
                    color: "var(--agx-accent, #22d3ee)",
                  }}
                >
                  <MetricIcon id={metric.id} />
                </span>
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {metric.label}
                </h3>
              </div>
              {metric.delta ? (
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
                  {metric.delta.value}
                </span>
              ) : null}
            </div>
            <p
              className="mt-4 text-[1.55rem] font-semibold tabular-nums tracking-tight"
              style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.02em" }}
            >
              {metric.value}
            </p>
            <p
              className="mt-1.5 text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {metric.caption}
            </p>
          </FinanceGlassCard>
        </motion.div>
      ))}
    </div>
  );
}
