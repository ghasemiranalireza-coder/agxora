"use client";

import { useMemo, useState, type JSX } from "react";
import type {
  FinanceInvoice,
  InvoiceSortKey,
  InvoiceStatus,
  PaymentStatus,
} from "../../lib/finance";
import {
  categoryLabel,
  DEFAULT_INVOICE_FILTERS,
  filterAndSortInvoices,
  formatDate,
  formatMoney,
  formatPercent,
  invoiceStatusLabel,
  paymentStatusLabel,
} from "../../lib/finance";
import { FinanceBadge, FinanceGlassCard } from "./FinancePrimitives";

function statusTone(
  status: InvoiceStatus,
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "paid":
      return "positive";
    case "overdue":
      return "critical";
    case "open":
      return "accent";
    case "draft":
      return "default";
    default:
      return "warning";
  }
}

function paymentTone(
  status: PaymentStatus,
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "paid":
      return "positive";
    case "partial":
      return "warning";
    case "unpaid":
      return "critical";
    default:
      return "default";
  }
}

const SORT_OPTIONS: { readonly value: InvoiceSortKey; readonly label: string }[] = [
  { value: "dueDate", label: "Due date" },
  { value: "amount", label: "Amount" },
  { value: "company", label: "Company" },
  { value: "status", label: "Status" },
  { value: "aiConfidence", label: "AI confidence" },
  { value: "number", label: "Invoice #" },
];

export function InvoiceCenter({
  invoices,
}: {
  readonly invoices: readonly FinanceInvoice[];
}): JSX.Element {
  const [search, setSearch] = useState(DEFAULT_INVOICE_FILTERS.search);
  const [status, setStatus] = useState<InvoiceStatus | "all">(DEFAULT_INVOICE_FILTERS.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">(
    DEFAULT_INVOICE_FILTERS.paymentStatus,
  );
  const [sortKey, setSortKey] = useState<InvoiceSortKey>(DEFAULT_INVOICE_FILTERS.sortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(DEFAULT_INVOICE_FILTERS.sortDir);

  const rows = useMemo(
    () =>
      filterAndSortInvoices(invoices, {
        search,
        status,
        paymentStatus,
        sortKey,
        sortDir,
      }),
    [invoices, search, status, paymentStatus, sortKey, sortDir],
  );

  const inputStyle = {
    borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
    background: "rgba(255,255,255,0.04)",
    color: "var(--agx-text, #f8fafc)",
  } as const;

  return (
    <FinanceGlassCard padding="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block space-y-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Number, company, category…"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </label>
          <label className="block space-y-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Status filter
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus | "all")}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Payment filter
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus | "all")}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="all">All payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Sort by
            <div className="flex gap-2">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as InvoiceSortKey)}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Toggle sort direction"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="rounded-xl border px-3 py-2 text-sm"
                style={inputStyle}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </label>
        </div>
        <p className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {rows.length} invoice{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead>
            <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {[
                "Invoice Number",
                "Company",
                "Amount",
                "VAT",
                "Status",
                "Due Date",
                "Payment Status",
                "Category",
                "AI Confidence",
              ].map((h) => (
                <th
                  key={h}
                  className="border-b px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr
                key={inv.id}
                className="transition-colors hover:bg-white/[0.03]"
                style={{ color: "var(--agx-text, #f8fafc)" }}
              >
                <td
                  className="border-b px-3 py-3 font-medium tabular-nums"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  {inv.number}
                </td>
                <td
                  className="border-b px-3 py-3"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  {inv.company}
                </td>
                <td
                  className="border-b px-3 py-3 tabular-nums"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  {formatMoney(inv.amount, inv.currency)}
                </td>
                <td
                  className="border-b px-3 py-3 tabular-nums"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  {formatMoney(inv.vat, inv.currency)}
                </td>
                <td
                  className="border-b px-3 py-3"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  <FinanceBadge tone={statusTone(inv.status)}>
                    {invoiceStatusLabel(inv.status)}
                  </FinanceBadge>
                </td>
                <td
                  className="border-b px-3 py-3 tabular-nums"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  {formatDate(inv.dueDate)}
                </td>
                <td
                  className="border-b px-3 py-3"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  <FinanceBadge tone={paymentTone(inv.paymentStatus)}>
                    {paymentStatusLabel(inv.paymentStatus)}
                  </FinanceBadge>
                </td>
                <td
                  className="border-b px-3 py-3"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  {categoryLabel(inv.category)}
                </td>
                <td
                  className="border-b px-3 py-3"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-16 overflow-hidden rounded-full"
                      style={{ background: "var(--agx-divider, rgba(255,255,255,0.08))" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${inv.aiConfidence}%`,
                          background: "var(--agx-accent, #22d3ee)",
                        }}
                      />
                    </div>
                    <span className="tabular-nums text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {formatPercent(inv.aiConfidence)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-10 text-center text-sm"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  No invoices match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </FinanceGlassCard>
  );
}
