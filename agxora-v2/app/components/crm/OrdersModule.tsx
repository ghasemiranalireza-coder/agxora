"use client";

import { useMemo, useState, type JSX } from "react";
import type { CrmOrder } from "../../lib/crm";
import { formatDate, formatMoney, orderStatusLabel, orderTotal } from "../../lib/crm";
import { CrmBadge, CrmButton, CrmGlassCard } from "./CrmPrimitives";

function statusTone(
  status: CrmOrder["status"],
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "delivered":
      return "positive";
    case "confirmed":
    case "in_fulfillment":
    case "shipped":
      return "accent";
    case "draft":
      return "default";
    default:
      return "critical";
  }
}

export function OrdersModule({
  orders,
}: {
  readonly orders: readonly CrmOrder[];
}): JSX.Element {
  const [notice, setNotice] = useState("Order creation API reserved for future write path.");
  const rows = useMemo(() => orders, [orders]);

  return (
    <CrmGlassCard padding="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Products, services, price, discount, tax, and customer — enterprise order ledger.
        </p>
        <CrmButton variant="primary" onClick={() => setNotice("Create Order draft staged (no API yet).")}>
          Create Order
        </CrmButton>
      </div>
      <p className="mb-4 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead>
            <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {["Order", "Customer", "Status", "Lines", "Net", "Tax", "Gross", "Created"].map((h) => (
                <th
                  key={h}
                  className="border-b px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => {
              const totals = orderTotal(order.lines);
              return (
                <tr key={order.id} style={{ color: "var(--agx-text, #f8fafc)" }}>
                  <td className="border-b px-3 py-3 font-medium" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {order.number}
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {order.customerName}
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    <CrmBadge tone={statusTone(order.status)}>{orderStatusLabel(order.status)}</CrmBadge>
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    <div className="space-y-1">
                      {order.lines.map((line) => (
                        <p key={line.id} className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                          {line.kind}: {line.name} ×{line.qty}
                          {line.discountPct > 0 ? ` · -${line.discountPct}%` : ""} · {line.taxPct}% tax
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="border-b px-3 py-3 tabular-nums" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {formatMoney(totals.net, order.currency)}
                  </td>
                  <td className="border-b px-3 py-3 tabular-nums" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {formatMoney(totals.tax, order.currency)}
                  </td>
                  <td className="border-b px-3 py-3 font-semibold tabular-nums" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {formatMoney(totals.gross, order.currency)}
                  </td>
                  <td className="border-b px-3 py-3 tabular-nums" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CrmGlassCard>
  );
}
