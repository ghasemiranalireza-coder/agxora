"use client";

import type { JSX, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useT } from "../../lib/i18n";
import { Card } from "../ui";
import { formatMoney, type ProjectAnalytics } from "../../lib/projects";

function KpiCard({
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
      transition={{ duration: 0.28 }}
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

export function ProjectKpiCards({
  analytics,
  currency = "EUR",
}: {
  readonly analytics: ProjectAnalytics;
  readonly currency?: string;
}): JSX.Element {
  const t = useT();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={t("projects.dashboard.kpi.activeProjects")}
        value={String(analytics.active)}
        hint={t("projects.dashboard.kpi.activeHint", {
          planning: analytics.planning,
        })}
        accent="var(--agx-accent, #22d3ee)"
      />
      <KpiCard
        label={t("projects.dashboard.kpi.completed")}
        value={String(analytics.completed)}
        hint={t("projects.dashboard.kpi.completedHint", {
          percent: analytics.completedPercent,
        })}
        accent="#34d399"
      />
      <KpiCard
        label={t("projects.dashboard.kpi.onHold")}
        value={String(analytics.onHold)}
        hint={t("projects.dashboard.kpi.onHoldHint", {
          archived: analytics.archived,
        })}
        accent="#fbbf24"
      />
      <KpiCard
        label={t("projects.dashboard.kpi.teamMembers")}
        value={String(analytics.teamMembers)}
        hint={t("projects.dashboard.kpi.teamHint")}
      />
      <KpiCard
        label={t("projects.dashboard.kpi.budgetOverview")}
        value={formatMoney(analytics.totalBudget, currency)}
        hint={t("projects.dashboard.kpi.budgetHint", {
          percent: analytics.budgetUsagePercent,
          spent: formatMoney(analytics.totalSpent, currency),
        })}
      />
      <KpiCard
        label={t("projects.dashboard.kpi.openTasks")}
        value={String(analytics.openTasks)}
        hint={t("projects.dashboard.kpi.openTasksHint", {
          overdue: analytics.overdueTasks,
        })}
        accent={analytics.overdueTasks > 0 ? "#fb7185" : undefined}
      />
      <KpiCard
        label={t("projects.dashboard.kpi.projectHealth")}
        value={`${analytics.healthScore}`}
        hint={t("projects.dashboard.kpi.healthHint")}
        accent={
          analytics.healthScore >= 70
            ? "#34d399"
            : analytics.healthScore >= 40
              ? "#fbbf24"
              : "#fb7185"
        }
      />
      <KpiCard
        label={t("projects.dashboard.kpi.upcomingDeadlines")}
        value={String(analytics.upcomingDeadlines.length)}
        hint={t("projects.dashboard.kpi.upcomingHint")}
      />
    </div>
  );
}

export function ProjectAnalyticsPanel({
  analytics,
}: {
  readonly analytics: ProjectAnalytics;
}): JSX.Element {
  const t = useT();

  return (
    <Card hover={false} className="space-y-4" padding="24px">
      <div>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("projects.dashboard.analytics.title")}
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("projects.dashboard.analytics.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("projects.dashboard.analytics.statusMix")}
          </p>
          {analytics.statusBreakdown.map((row) => (
            <BarRow
              key={row.status}
              label={t(`projects.status.${row.status}`)}
              percent={row.percent}
              value={`${row.count}`}
            />
          ))}
        </div>
        <div className="space-y-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("projects.dashboard.analytics.deliverySignals")}
          </p>
          <BarRow
            label={t("projects.dashboard.analytics.completedPercent")}
            percent={analytics.completedPercent}
            value={`${analytics.completedPercent}%`}
            color="#34d399"
          />
          <BarRow
            label={t("projects.dashboard.analytics.budgetUsage")}
            percent={Math.min(100, analytics.budgetUsagePercent)}
            value={`${analytics.budgetUsagePercent}%`}
            color="#60a5fa"
          />
          <BarRow
            label={t("projects.dashboard.analytics.health")}
            percent={analytics.healthScore}
            value={`${analytics.healthScore}`}
            color="#22d3ee"
          />
        </div>
      </div>

      <div>
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("projects.dashboard.analytics.upcomingDeadlines")}
        </p>
        {analytics.upcomingDeadlines.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("projects.dashboard.analytics.noUpcomingDeadlines")}
          </p>
        ) : (
          <ul className="space-y-2">
            {analytics.upcomingDeadlines.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <span style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {item.name}
                  <span
                    className="ml-2 text-[11px] uppercase tracking-wide"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {t(`projects.kind.${item.kind}`)}
                  </span>
                </span>
                <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {item.dueDate.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function BarRow({
  label,
  percent,
  value,
  color = "var(--agx-accent, #22d3ee)",
}: {
  readonly label: string;
  readonly percent: number;
  readonly value: string;
  readonly color?: string;
}): JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span
          className="capitalize"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {label}
        </span>
        <span style={{ color: "var(--agx-text, #f8fafc)" }}>{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function RecentActivityList({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const t = useT();

  return (
    <Card hover={false} className="space-y-3" padding="24px">
      <div>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("projects.dashboard.recentActivity.title")}
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("projects.dashboard.recentActivity.subtitle")}
        </p>
      </div>
      {children}
    </Card>
  );
}
