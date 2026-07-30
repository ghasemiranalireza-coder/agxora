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
import { DataTable, FilterSelect, IconButton, SearchField } from "../ui";
import type { DataTableColumn } from "../ui";
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

const COLUMNS: readonly DataTableColumn<FinanceInvoice>[] = [
  {
    key: "number",
    header: "Invoice Number",
    render: (inv) => <span className="font-medium tabular-nums">{inv.number}</span>,
  },
  { key: "company", header: "Company", render: (inv) => inv.company },
  {
    key: "amount",
    header: "Amount",
    render: (inv) => (
      <span className="tabular-nums">{formatMoney(inv.amount, inv.currency)}</span>
    ),
  },
  {
    key: "vat",
    header: "VAT",
    render: (inv) => (
      <span className="tabular-nums">{formatMoney(inv.vat, inv.currency)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (inv) => (
      <FinanceBadge tone={statusTone(inv.status)}>
        {invoiceStatusLabel(inv.status)}
      </FinanceBadge>
    ),
  },
  {
    key: "dueDate",
    header: "Due Date",
    render: (inv) => <span className="tabular-nums">{formatDate(inv.dueDate)}</span>,
  },
  {
    key: "payment",
    header: "Payment Status",
    render: (inv) => (
      <FinanceBadge tone={paymentTone(inv.paymentStatus)}>
        {paymentStatusLabel(inv.paymentStatus)}
      </FinanceBadge>
    ),
  },
  {
    key: "category",
    header: "Category",
    render: (inv) => categoryLabel(inv.category),
  },
  {
    key: "ai",
    header: "AI Confidence",
    render: (inv) => (
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
    ),
  },
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
  const [page, setPage] = useState(1);

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

  return (
    <FinanceGlassCard padding="p-5">
      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={(inv) => inv.id}
        minWidth={960}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        emptyTitle="No invoices"
        emptyDescription="No invoices match your search or filters."
        toolbar={
          <>
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SearchField
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Number, company, category…"
              />
              <FilterSelect
                label="Status filter"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as InvoiceStatus | "all");
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </FilterSelect>
              <FilterSelect
                label="Payment filter"
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value as PaymentStatus | "all");
                  setPage(1);
                }}
              >
                <option value="all">All payments</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </FilterSelect>
              <div className="flex items-end gap-2">
                <FilterSelect
                  label="Sort by"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as InvoiceSortKey)}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FilterSelect>
                <IconButton
                  label="Toggle sort direction"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  <span aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>
                </IconButton>
              </div>
            </div>
            <p className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {rows.length} invoice{rows.length === 1 ? "" : "s"}
            </p>
          </>
        }
      />
    </FinanceGlassCard>
  );
}
