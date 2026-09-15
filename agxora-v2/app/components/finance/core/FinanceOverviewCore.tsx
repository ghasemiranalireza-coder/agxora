"use client";

import { useEffect, useState, type JSX } from "react";
import Link from "next/link";
import { useLocale } from "../../../lib/i18n";
import { Button, Card, EmptyState, ErrorState, SkeletonCard } from "../../ui";
import { FinanceShell } from "./FinanceShell";
import { fetchFinanceOverview } from "./financeApi";
import type { FinanceOverviewView } from "../../../lib/finance/core/types";

function MetricCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <Card className="min-w-0 space-y-2" padding="18px">
      <p className="agx-ui-label">{label}</p>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </p>
    </Card>
  );
}

export function FinanceOverviewCore(): JSX.Element {
  const { t } = useLocale();
  const [overview, setOverview] = useState<FinanceOverviewView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchFinanceOverview();
        if (!cancelled) {
          setOverview(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("finance.core.errors.load"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <FinanceShell>
      {loading ? (
        <div className="agx-finance-kpis">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState title={t("finance.core.errors.load")} description={error} />
      ) : overview &&
        overview.totalDeliveryNotes === 0 &&
        overview.totalInvoices === 0 ? (
        <EmptyState
          title={t("finance.core.empty.overviewTitle")}
          description={t("finance.core.empty.overviewBody")}
          footer={
            <Link href="/dashboard/finance/delivery-notes" style={{ textDecoration: "none" }}>
              <Button variant="primary">{t("finance.core.actions.createDeliveryNote")}</Button>
            </Link>
          }
        />
      ) : overview ? (
        <div className="agx-finance-kpis">
          <MetricCard
            label={t("finance.core.kpis.openDeliveryNotes")}
            value={String(overview.openDeliveryNotes)}
          />
          <MetricCard
            label={t("finance.core.kpis.unbilled")}
            value={String(overview.unbilledDeliveryNotes)}
          />
          <MetricCard
            label={t("finance.core.kpis.openInvoices")}
            value={String(overview.openInvoices)}
          />
          <MetricCard
            label={t("finance.core.kpis.overdue")}
            value={String(overview.overdueInvoices)}
          />
          <MetricCard
            label={t("finance.core.kpis.draftInvoices")}
            value={String(overview.draftInvoices)}
          />
        </div>
      ) : null}
    </FinanceShell>
  );
}
