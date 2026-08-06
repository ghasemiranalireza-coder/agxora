"use client";

import type { JSX, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Active Projects"
        value={String(analytics.active)}
        hint={`${analytics.planning} planning`}
        accent="var(--agx-accent, #22d3ee)"
      />
      <KpiCard
        label="Completed"
        value={String(analytics.completed)}
        hint={`${analytics.completedPercent}% of portfolio`}
        accent="#34d399"
      />
      <KpiCard
        label="On Hold"
        value={String(analytics.onHold)}
        hint={`${analytics.archived} archived`}
        accent="#fbbf24"
      />
      <KpiCard
        label="Team Members"
        value={String(analytics.teamMembers)}
        hint="Across all projects"
      />
      <KpiCard
        label="Budget Overview"
        value={formatMoney(analytics.totalBudget, currency)}
        hint={`${analytics.budgetUsagePercent}% used · ${formatMoney(analytics.totalSpent, currency)} spent`}
      />
      <KpiCard
        label="Open Tasks"
        value={String(analytics.openTasks)}
        hint={`${analytics.overdueTasks} overdue`}
        accent={analytics.overdueTasks > 0 ? "#fb7185" : undefined}
      />
      <KpiCard
        label="Project Health"
        value={`${analytics.healthScore}`}
        hint="Composite delivery score"
        accent={
          analytics.healthScore >= 70
            ? "#34d399"
            : analytics.healthScore >= 40
              ? "#fbbf24"
              : "#fb7185"
        }
      />
      <KpiCard
        label="Upcoming Deadlines"
        value={String(analytics.upcomingDeadlines.length)}
        hint="Next 30 days"
      />
    </div>
  );
}

export function ProjectAnalyticsPanel({
  analytics,
}: {
  readonly analytics: ProjectAnalytics;
}): JSX.Element {
  return (
    <Card hover={false} className="space-y-4" padding="24px">
      <div>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Analytics
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Portfolio health, completion, and budget usage.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Status mix
          </p>
          {analytics.statusBreakdown.map((row) => (
            <BarRow
              key={row.status}
              label={row.status.replace("_", " ")}
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
            Delivery signals
          </p>
          <BarRow
            label="Completed %"
            percent={analytics.completedPercent}
            value={`${analytics.completedPercent}%`}
            color="#34d399"
          />
          <BarRow
            label="Budget usage"
            percent={Math.min(100, analytics.budgetUsagePercent)}
            value={`${analytics.budgetUsagePercent}%`}
            color="#60a5fa"
          />
          <BarRow
            label="Health"
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
          Upcoming deadlines
        </p>
        {analytics.upcomingDeadlines.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            No upcoming deadlines in the next window.
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
                    {item.kind}
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
  return (
    <Card hover={false} className="space-y-3" padding="24px">
      <div>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Recent Activity
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Newest project events first.
        </p>
      </div>
      {children}
    </Card>
  );
}
