"use client";

import type { JSX } from "react";
import type { TaxDeadline, VatSummary } from "../../lib/finance";
import { formatDate, formatMoney } from "../../lib/finance";
import { FinanceBadge, FinanceGlassCard } from "./FinancePrimitives";

function deadlineTone(
  status: TaxDeadline["status"],
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "paid":
      return "positive";
    case "due_soon":
      return "warning";
    case "overdue":
      return "critical";
    default:
      return "accent";
  }
}

function deadlineLabel(status: TaxDeadline["status"]): string {
  switch (status) {
    case "due_soon":
      return "Due soon";
    case "upcoming":
      return "Upcoming";
    case "overdue":
      return "Overdue";
    case "paid":
      return "Paid";
  }
}

export function TaxCenter({
  vatSummaries,
  deadlines,
}: {
  readonly vatSummaries: readonly VatSummary[];
  readonly deadlines: readonly TaxDeadline[];
}): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <FinanceGlassCard className="space-y-4" padding="p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          VAT Summary
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vatSummaries.map((vat) => (
            <div
              key={`${vat.periodType}-${vat.periodLabel}`}
              className="rounded-2xl border p-4"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {vat.periodType === "monthly" ? "Monthly VAT" : "Quarterly VAT"}
                </p>
                <FinanceBadge tone="accent">{vat.periodLabel}</FinanceBadge>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Collected</dt>
                  <dd className="tabular-nums" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {formatMoney(vat.collected, vat.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Deductible</dt>
                  <dd className="tabular-nums" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {formatMoney(vat.deductible, vat.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t pt-2" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}>
                  <dt className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    Net due
                  </dt>
                  <dd className="font-semibold tabular-nums" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                    {formatMoney(vat.netDue, vat.currency)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </FinanceGlassCard>

      <FinanceGlassCard className="space-y-4" padding="p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Tax Deadlines · Upcoming Payments
        </h3>
        <ul className="space-y-3">
          {deadlines.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div>
                <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {item.label}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  Due {formatDate(item.dueDate)} · {item.period}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {formatMoney(item.amount, item.currency)}
                </p>
                <div className="mt-1 flex justify-end">
                  <FinanceBadge tone={deadlineTone(item.status)}>
                    {deadlineLabel(item.status)}
                  </FinanceBadge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </FinanceGlassCard>
    </div>
  );
}
