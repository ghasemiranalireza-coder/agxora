"use client";

import type { JSX } from "react";
import type { AiInsight } from "../../lib/finance";
import { formatDate, severityTone } from "../../lib/finance";
import { FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

const KIND_LABEL: Record<AiInsight["kind"], string> = {
  unusual_expense: "Unusual expenses",
  duplicate_invoice: "Duplicate invoices",
  missing_invoice: "Missing invoices",
  late_payment: "Late payments",
  cashflow_prediction: "Cashflow prediction",
  tax_optimization: "Tax optimization",
};

export function AiInsights({
  insights,
}: {
  readonly insights: readonly AiInsight[];
}): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => {
        const tone = severityTone(insight.severity);
        return (
          <FinanceGlassCard key={insight.id} className="flex h-full flex-col gap-3" padding="p-5">
            <div className="flex items-start justify-between gap-2">
              <span
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={tone}
              >
                {KIND_LABEL[insight.kind]}
              </span>
              <span className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {formatDate(insight.detectedAt)}
              </span>
            </div>
            <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {insight.title}
            </h3>
            <p className="flex-1 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {insight.description}
            </p>
            {insight.actionLabel ? (
              <div>
                <FinanceButton variant="primary">{insight.actionLabel}</FinanceButton>
              </div>
            ) : null}
          </FinanceGlassCard>
        );
      })}
    </div>
  );
}
