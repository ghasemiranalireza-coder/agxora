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
import { useLocale } from "../../lib/i18n";
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

const SORT_KEYS: readonly InvoiceSortKey[] = [
  "dueDate",
  "amount",
  "company",
  "status",
  "aiConfidence",
  "number",
];

export function InvoiceCenter({
  invoices,
}: {
  readonly invoices: readonly FinanceInvoice[];
}): JSX.Element {
  const { t } = useLocale();
  const [search, setSearch] = useState(DEFAULT_INVOICE_FILTERS.search);
  const [status, setStatus] = useState<InvoiceStatus | "all">(
    DEFAULT_INVOICE_FILTERS.status,
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">(
    DEFAULT_INVOICE_FILTERS.paymentStatus,
  );
  const [sortKey, setSortKey] = useState<InvoiceSortKey>(
    DEFAULT_INVOICE_FILTERS.sortKey,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    DEFAULT_INVOICE_FILTERS.sortDir,
  );
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

  const columns: readonly DataTableColumn<FinanceInvoice>[] = useMemo(
    () => [
      {
        key: "number",
        header: t("finance.invoices.columns.number"),
        render: (inv) => (
          <span className="font-medium tabular-nums">{inv.number}</span>
        ),
      },
      {
        key: "company",
        header: t("finance.invoices.columns.company"),
        render: (inv) => inv.company,
      },
      {
        key: "amount",
        header: t("finance.invoices.columns.amount"),
        render: (inv) => (
          <span className="tabular-nums">
            {formatMoney(inv.amount, inv.currency)}
          </span>
        ),
      },
      {
        key: "vat",
        header: t("finance.invoices.columns.vat"),
        render: (inv) => (
          <span className="tabular-nums">
            {formatMoney(inv.vat, inv.currency)}
          </span>
        ),
      },
      {
        key: "status",
        header: t("finance.invoices.columns.status"),
        render: (inv) => (
          <FinanceBadge tone={statusTone(inv.status)}>
            {t(invoiceStatusLabel(inv.status))}
          </FinanceBadge>
        ),
      },
      {
        key: "dueDate",
        header: t("finance.invoices.columns.dueDate"),
        render: (inv) => (
          <span className="tabular-nums">{formatDate(inv.dueDate)}</span>
        ),
      },
      {
        key: "payment",
        header: t("finance.invoices.columns.payment"),
        render: (inv) => (
          <FinanceBadge tone={paymentTone(inv.paymentStatus)}>
            {t(paymentStatusLabel(inv.paymentStatus))}
          </FinanceBadge>
        ),
      },
      {
        key: "category",
        header: t("finance.invoices.columns.category"),
        render: (inv) => t(categoryLabel(inv.category)),
      },
      {
        key: "ai",
        header: t("finance.invoices.columns.ai"),
        render: (inv) => (
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-16 overflow-hidden rounded-full"
              style={{
                background: "var(--agx-divider, rgba(255,255,255,0.08))",
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${inv.aiConfidence}%`,
                  background: "var(--agx-accent, #22d3ee)",
                }}
              />
            </div>
            <span
              className="tabular-nums text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {formatPercent(inv.aiConfidence)}
            </span>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <FinanceGlassCard padding="p-5">
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(inv) => inv.id}
        minWidth={960}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        emptyTitle={t("finance.invoices.emptyTitle")}
        emptyDescription={t("finance.invoices.emptyDescription")}
        toolbar={
          <>
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SearchField
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder={t("finance.invoices.searchPlaceholder")}
              />
              <FilterSelect
                label={t("finance.invoices.statusFilter")}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as InvoiceStatus | "all");
                  setPage(1);
                }}
              >
                <option value="all">{t("finance.invoices.allStatuses")}</option>
                <option value="open">{t("finance.status.open")}</option>
                <option value="paid">{t("finance.status.paid")}</option>
                <option value="overdue">{t("finance.status.overdue")}</option>
                <option value="draft">{t("finance.status.draft")}</option>
                <option value="cancelled">
                  {t("finance.status.cancelled")}
                </option>
              </FilterSelect>
              <FilterSelect
                label={t("finance.invoices.paymentFilter")}
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value as PaymentStatus | "all");
                  setPage(1);
                }}
              >
                <option value="all">{t("finance.invoices.allPayments")}</option>
                <option value="unpaid">{t("finance.payment.unpaid")}</option>
                <option value="partial">{t("finance.payment.partial")}</option>
                <option value="paid">{t("finance.payment.paid")}</option>
                <option value="refunded">{t("finance.payment.refunded")}</option>
              </FilterSelect>
              <div className="flex items-end gap-2">
                <FilterSelect
                  label={t("finance.invoices.sortBy")}
                  value={sortKey}
                  onChange={(e) =>
                    setSortKey(e.target.value as InvoiceSortKey)
                  }
                >
                  {SORT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(`finance.invoices.sort.${key}`)}
                    </option>
                  ))}
                </FilterSelect>
                <IconButton
                  label={t("finance.invoices.toggleSort")}
                  onClick={() =>
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                  }
                >
                  <span aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>
                </IconButton>
              </div>
            </div>
            <p
              className="text-xs tabular-nums"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {t(
                rows.length === 1
                  ? "finance.invoices.countOne"
                  : "finance.invoices.count",
                { count: rows.length },
              )}
            </p>
          </>
        }
      />
    </FinanceGlassCard>
  );
}
