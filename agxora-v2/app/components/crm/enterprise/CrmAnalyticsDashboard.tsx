"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "../../ui";
import type { CrmAnalytics } from "../../../lib/crm/directory";
import { formatDate, useLocale } from "../../../lib/i18n";

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly accent?: string;
}): JSX.Element {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card hover className="h-full space-y-2" padding="18px">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {label}
        </p>
        <p
          className="text-2xl font-semibold tracking-tight"
          style={{ color: accent || "var(--agx-text, #f8fafc)" }}
        >
          {value}
        </p>
        {hint ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {hint}
          </p>
        ) : null}
      </Card>
    </motion.div>
  );
}

export function CrmAnalyticsDashboard({
  analytics,
}: {
  readonly analytics: CrmAnalytics;
}): JSX.Element {
  const { t, locale } = useLocale();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t("crm.analytics.totalCustomers")} value={String(analytics.total)} />
        <Kpi
          label={t("crm.analytics.activeCustomers")}
          value={String(analytics.active)}
          accent="#34d399"
        />
        <Kpi
          label={t("crm.analytics.newCustomers")}
          value={String(analytics.newThisMonth)}
          hint={t("crm.analytics.createdThisMonth")}
          accent="var(--agx-accent, #22d3ee)"
        />
        <Kpi
          label={t("crm.analytics.vipCustomers")}
          value={String(analytics.vip)}
          accent="#a78bfa"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card hover={false} className="space-y-3" padding="18px">
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("crm.analytics.leadConversion")}
          </h2>
          <p className="text-3xl font-semibold" style={{ color: "#22d3ee" }}>
            {analytics.conversionPlaceholder}%
          </p>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("crm.analytics.leadConversionHint")}
          </p>
        </Card>
        <Card hover={false} className="space-y-3" padding="18px">
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("crm.analytics.customerGrowth")}
          </h2>
          <div className="space-y-2">
            {analytics.growthByMonth.map((row) => {
              const monthLabel = formatDate(`${row.label}-01T00:00:00Z`, locale, {
                month: "short",
                year: "numeric",
              });
              return (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {monthLabel}
                  </span>
                  <span style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {row.count}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, row.count * 12)}%`,
                      background: "var(--agx-accent, #22d3ee)",
                    }}
                  />
                </div>
              </div>
            );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
