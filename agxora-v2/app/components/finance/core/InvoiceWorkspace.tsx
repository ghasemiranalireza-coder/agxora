"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type JSX } from "react";
import { formatCurrency, formatDisplayDate, useLocale } from "../../../lib/i18n";
import type { InvoiceStatus, InvoiceView } from "../../../lib/finance/core/types";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchField,
} from "../../ui";
import { FinanceShell } from "./FinanceShell";
import { IssuedInvoiceDocument } from "../documents/IssuedDocument";
import { fetchInvoice, fetchInvoices, updateInvoiceStatus } from "./financeApi";

function money(value: string, currency: string): string {
  return formatCurrency(Number(value), undefined, currency);
}

function statusTone(status: InvoiceStatus): "default" | "positive" | "warning" | "accent" {
  if (status === "PAID") return "positive";
  if (status === "OVERDUE" || status === "CANCELLED") return "warning";
  if (status === "OPEN") return "accent";
  return "default";
}

export function InvoiceWorkspace({
  detailId,
}: {
  readonly detailId?: string;
}): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<InvoiceView[]>([]);
  const [detail, setDetail] = useState<InvoiceView | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const items = await fetchInvoices({
        query,
        status,
      });
      setRows(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [query, status, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await fetchInvoices({ query, status });
        if (cancelled) return;
        setRows(items);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("finance.core.errors.load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, status, t]);

  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    void (async () => {
      try {
        const invoice = await fetchInvoice(detailId);
        if (!cancelled) setDetail(invoice);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("finance.core.errors.load"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId, t]);

  async function setStatusForDetail(next: InvoiceStatus): Promise<void> {
    if (!detail) return;
    try {
      const updated = await updateInvoiceStatus(detail.id, next);
      setDetail(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.save"));
    }
  }

  return (
    <FinanceShell titleKey="finance.core.invoice.title" subtitleKey="finance.core.invoice.subtitle">
      <div className="agx-finance-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t("finance.core.filters.searchInvoice")}
          label={t("finance.core.filters.searchInvoice")}
        />
        <FilterSelect
          label={t("finance.core.filters.status")}
          value={status}
          onChange={(event) => setStatus(event.target.value as InvoiceStatus | "all")}
        >
          <option value="all">{t("finance.core.filters.allStatuses")}</option>
          <option value="DRAFT">{t("finance.core.invoiceStatus.DRAFT")}</option>
          <option value="OPEN">{t("finance.core.invoiceStatus.OPEN")}</option>
          <option value="PAID">{t("finance.core.invoiceStatus.PAID")}</option>
          <option value="OVERDUE">{t("finance.core.invoiceStatus.OVERDUE")}</option>
          <option value="CANCELLED">{t("finance.core.invoiceStatus.CANCELLED")}</option>
        </FilterSelect>
      </div>

      {error ? <ErrorState title={t("finance.core.errors.load")} description={error} /> : null}

      {loading ? (
        <Card padding="18px">{t("finance.core.loading")}</Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("finance.core.empty.invoiceTitle")}
          description={t("finance.core.empty.invoiceBody")}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "number",
              header: t("finance.core.table.invoiceNumber"),
              render: (row) => row.invoiceNumber,
            },
            {
              key: "date",
              header: t("finance.core.table.date"),
              render: (row) => formatDisplayDate(row.invoiceDate),
            },
            {
              key: "customer",
              header: t("finance.core.table.customer"),
              render: (row) => row.customerCompanyName,
            },
            {
              key: "net",
              header: t("finance.core.totals.net"),
              align: "end",
              render: (row) => money(row.netTotal, row.currency),
            },
            {
              key: "tax",
              header: t("finance.core.totals.tax"),
              align: "end",
              render: (row) => money(row.taxTotal, row.currency),
            },
            {
              key: "gross",
              header: t("finance.core.totals.gross"),
              align: "end",
              render: (row) => money(row.grossTotal, row.currency),
            },
            {
              key: "due",
              header: t("finance.core.table.dueDate"),
              render: (row) => formatDisplayDate(row.dueDate),
            },
            {
              key: "status",
              header: t("finance.core.table.status"),
              render: (row) => (
                <Badge tone={statusTone(row.status)}>{t(`finance.core.invoiceStatus.${row.status}`)}</Badge>
              ),
            },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/dashboard/finance/invoices/${row.id}`)}
        />
      )}

      {detail && detailId ? (
        <Card className="space-y-4" padding="18px">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{detail.invoiceNumber}</h2>
            <p>{detail.customerCompanyName}</p>
            <p>
              {t("finance.core.table.date")}: {formatDisplayDate(detail.invoiceDate)} ·{" "}
              {t("finance.core.table.dueDate")}: {formatDisplayDate(detail.dueDate)}
            </p>
            <Badge tone={statusTone(detail.status)}>
              {t(`finance.core.invoiceStatus.${detail.status}`)}
            </Badge>
          </div>
          <div className="agx-finance-actions">
            <Button disabled={detail.status !== "DRAFT"} onClick={() => void setStatusForDetail("OPEN")}>
              {t("finance.core.actions.markOpen")}
            </Button>
            <Button disabled={detail.status === "CANCELLED"} onClick={() => void setStatusForDetail("PAID")}>
              {t("finance.core.actions.markPaid")}
            </Button>
            <Button
              variant="danger"
              disabled={detail.status === "CANCELLED" || detail.status === "PAID"}
              onClick={() => void setStatusForDetail("CANCELLED")}
            >
              {t("finance.core.actions.markCancelled")}
            </Button>
          </div>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("finance.core.invoice.futureBoundary")}
          </p>
          <div>
            <h3 className="text-sm font-semibold">{t("finance.core.invoice.createdFrom")}</h3>
            <ul className="mt-2 space-y-1">
              {detail.sourceDeliveryNotes.map((note) => (
                <li key={note.id}>
                  <Link href={`/dashboard/finance/delivery-notes/${note.id}`}>{note.number}</Link>
                  {" · "}
                  {formatDisplayDate(note.date)} · {money(note.netTotal, detail.currency)}
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-1 text-sm">
            {detail.items.map((item) => (
              <li key={item.id}>
                {item.description} · {item.quantity} {item.unit} · {money(item.lineTotalNet, detail.currency)}
              </li>
            ))}
          </ul>
          <p>
            {t("finance.core.totals.net")}: {money(detail.netTotal, detail.currency)} ·{" "}
            {t("finance.core.totals.tax")}: {money(detail.taxTotal, detail.currency)} ·{" "}
            {t("finance.core.totals.gross")}: {money(detail.grossTotal, detail.currency)}
          </p>
          <IssuedInvoiceDocument invoice={detail} />
        </Card>
      ) : null}
    </FinanceShell>
  );
}
