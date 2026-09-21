"use client";

import { useEffect, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDisplayDate, useLocale } from "../../../lib/i18n";
import {
  createInvoiceHrefForCustomer,
  invoiceDetailHref,
  invoiceStatusMessageKey,
} from "../../../lib/workspace/firstCustomerInvoiceUx";
import type { InvoiceView } from "../../../lib/finance/core/types";
import { fetchInvoices } from "../../finance/core/financeApi";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
} from "../../ui";

function statusTone(status: InvoiceView["status"]): "default" | "positive" | "warning" | "accent" {
  if (status === "PAID") return "positive";
  if (status === "OVERDUE" || status === "CANCELLED") return "warning";
  if (status === "OPEN") return "accent";
  return "default";
}

export function CrmCustomerInvoices({
  customerId,
}: {
  readonly customerId: string;
}): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<InvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await fetchInvoices({ customerId });
        if (cancelled) return;
        setRows(items);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("crm.profile.invoices.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, t]);

  const createHref = createInvoiceHrefForCustomer(customerId);

  if (loading) {
    return (
      <Card hover={false} padding="18px">
        {t("finance.core.loading")}
      </Card>
    );
  }

  if (error) {
    return (
      <Card hover={false} className="space-y-3" padding="18px">
        <ErrorState title={t("crm.profile.invoices.loadError")} description={error} />
        <Button
          size="sm"
          variant="primary"
          onClick={() => router.push(createHref)}
        >
          {t("crm.profile.invoices.createCta")}
        </Button>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("crm.profile.invoices.emptyTitle")}
        description={t("crm.profile.invoices.emptyDescription")}
        actionLabel={t("crm.profile.invoices.createCta")}
        onAction={() => router.push(createHref)}
      />
    );
  }

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p
          className="text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("crm.profile.invoices.hint")}
        </p>
        <Button
          size="sm"
          variant="primary"
          onClick={() => router.push(createHref)}
        >
          {t("crm.profile.invoices.createCta")}
        </Button>
      </div>
      <ul className="space-y-2">
        {rows.map((invoice) => (
          <li key={invoice.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
                color: "var(--agx-text, #f8fafc)",
              }}
              onClick={() => router.push(invoiceDetailHref(invoice.id))}
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{invoice.invoiceNumber}</span>
                <span
                  className="block text-[11px]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {formatDisplayDate(invoice.invoiceDate)} · {invoice.customerCompanyName} ·{" "}
                  {formatCurrency(Number(invoice.grossTotal), undefined, invoice.currency)}
                </span>
              </span>
              <Badge tone={statusTone(invoice.status)}>
                {t(invoiceStatusMessageKey(invoice.status))}
              </Badge>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
