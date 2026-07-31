"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { intelligenceStore } from "../store";
import { intelligenceService } from "../services";
import { useEnterpriseIntelligence } from "../hooks";
import { getKpiDefinition } from "../kpi";
import { normalizeSeries } from "../visualization";
import type {
  AnalyticsDomain,
  DataExplorerRow,
  IntelligenceAlert,
  KpiSnapshot,
  ReportDefinition,
  Scorecard,
} from "../types";

type TabId =
  | "executive"
  | "health"
  | "workspace"
  | "kpis"
  | "reports"
  | "insights"
  | "forecasts"
  | "alerts"
  | "scorecards"
  | "explorer";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "executive", label: "Executive" },
  { id: "health", label: "Business Health" },
  { id: "workspace", label: "Analytics" },
  { id: "kpis", label: "KPI Center" },
  { id: "reports", label: "Reports" },
  { id: "insights", label: "Insights" },
  { id: "forecasts", label: "Forecasts" },
  { id: "alerts", label: "Alerts" },
  { id: "scorecards", label: "Scorecards" },
  { id: "explorer", label: "Data Explorer" },
];

/**
 * Enterprise Intelligence Center workspace.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function EnterpriseIntelligenceCenter(): JSX.Element {
  const eic = useEnterpriseIntelligence();
  const [tab, setTab] = useState<TabId>("executive");
  const [notice, setNotice] = useState(
    "Analytics are repository-driven and independent from UI chrome.",
  );
  const [domainFilter, setDomainFilter] = useState<AnalyticsDomain | "all">(
    "all",
  );
  const [explorerQuery, setExplorerQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    intelligenceStore.hydrate();
  }, []);

  useEffect(() => {
    if (!eic.hydrated) return;
    intelligenceService.ensureWorkspace(eic.organizationId);
  }, [eic.hydrated, eic.organizationId]);

  const filterFrom = dateFrom || eic.filter.dateFrom || "";
  const filterTo = dateTo || eic.filter.dateTo || "";

  const explorerRows = useMemo(() => {
    const base = eic.explorerRows;
    const q = explorerQuery.trim().toLowerCase();
    const searched = !q
      ? base
      : base.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.entity.toLowerCase().includes(q) ||
            r.domain.includes(q),
        );
    if (domainFilter === "all") return searched;
    return searched.filter((r) => r.domain === domainFilter);
  }, [eic.explorerRows, explorerQuery, domainFilter]);

  if (!eic.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Loading Enterprise Intelligence Center…
      </div>
    );
  }

  if (!eic.permissions.canRead) {
    return (
      <Card padding="24px" hover={false}>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          You do not have intelligence.read permission for this workspace.
        </p>
      </Card>
    );
  }

  const applyDates = () => {
    intelligenceService.updateFilter(eic.organizationId, {
      dateFrom: filterFrom || undefined,
      dateTo: filterTo || undefined,
      domains: domainFilter === "all" ? undefined : [domainFilter],
    });
    setNotice("Filters updated");
  };

  const kpiColumns: DataTableColumn<KpiSnapshot>[] = [
    {
      key: "name",
      header: "KPI",
      render: (r) => getKpiDefinition(r.kpiId)?.name ?? r.kpiId,
    },
    {
      key: "value",
      header: "Value",
      render: (r) => formatKpi(r),
    },
    {
      key: "delta",
      header: "Δ%",
      render: (r) =>
        r.deltaPercent == null ? "—" : `${r.deltaPercent > 0 ? "+" : ""}${r.deltaPercent}%`,
    },
    { key: "trend", header: "Trend", render: (r) => r.trend },
    {
      key: "target",
      header: "Target",
      render: (r) => (r.target == null ? "—" : String(r.target)),
    },
  ];

  const alertColumns: DataTableColumn<IntelligenceAlert>[] = [
    { key: "severity", header: "Severity", render: (r) => r.severity },
    { key: "title", header: "Alert", render: (r) => r.title },
    { key: "domain", header: "Domain", render: (r) => r.domain },
    {
      key: "ack",
      header: "Status",
      render: (r) => (r.acknowledged ? "acked" : "open"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.acknowledged ? (
          "—"
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              intelligenceService.acknowledgeAlert(r.id);
              setNotice(`Acknowledged: ${r.title}`);
            }}
          >
            Acknowledge
          </Button>
        ),
    },
  ];

  const reportColumns: DataTableColumn<ReportDefinition>[] = [
    { key: "title", header: "Report", render: (r) => r.title },
    { key: "kind", header: "Kind", render: (r) => r.kind },
    {
      key: "schedule",
      header: "Schedule",
      render: (r) => r.scheduleCron ?? "on-demand",
    },
    {
      key: "export",
      header: "Export",
      render: (r) => (
        <div className="flex gap-1">
          {r.exportFormats.map((f) => (
            <Button
              key={f}
              size="sm"
              variant="ghost"
              disabled={!eic.permissions.canExport}
              onClick={() => {
                const res = intelligenceService.exportReport(r, f);
                setNotice(`Export placeholder ${res.format} for ${r.title}`);
              }}
            >
              {f}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  const scoreColumns: DataTableColumn<Scorecard>[] = [
    { key: "name", header: "Scorecard", render: (r) => r.name },
    { key: "score", header: "Score", render: (r) => String(r.score) },
    {
      key: "drivers",
      header: "Top driver",
      render: (r) => r.drivers[0]?.label ?? "—",
    },
  ];

  const explorerColumns: DataTableColumn<DataExplorerRow>[] = [
    { key: "domain", header: "Domain", render: (r) => r.domain },
    { key: "label", header: "Label", render: (r) => r.label },
    { key: "entity", header: "Entity", render: (r) => r.entity },
    { key: "measure", header: "Measure", render: (r) => String(r.measure) },
    { key: "at", header: "Date", render: (r) => r.at },
  ];

  const health = eic.health;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          Enterprise Intelligence Center
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Intelligence
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Transform enterprise data into actionable insights — KPIs, scorecards,
          alerts, reports, and AI-ready recommendations across every AGXORA module.
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            From
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 block rounded-lg border px-2 py-1 text-sm"
              style={fieldStyle}
            />
          </label>
          <label className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            To
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 block rounded-lg border px-2 py-1 text-sm"
              style={fieldStyle}
            />
          </label>
          <label className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Domain
            <select
              value={domainFilter}
              onChange={(e) =>
                setDomainFilter(e.target.value as AnalyticsDomain | "all")
              }
              className="mt-1 block rounded-lg border px-2 py-1 text-sm"
              style={fieldStyle}
            >
              <option value="all">All domains</option>
              {eic.domains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="secondary" onClick={applyDates}>
            Apply filters
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              intelligenceService.refresh(eic.organizationId);
              setNotice("Intelligence workspace refreshed");
            }}
          >
            Refresh
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "primary" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </Card>

      {tab === "executive" && health ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Company Health" value={`${health.overall}`} />
            <Stat label="Revenue score" value={`${health.revenue}`} />
            <Stat label="Customer health" value={`${health.customers}`} />
            <Stat label="Project health" value={`${health.projects}`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Workflow success" value={`${health.workflows}`} />
            <Stat label="AI activity" value={`${health.ai}`} />
            <Stat label="Finance" value={`${health.finance}`} />
            <Stat label="Risk / Growth" value={`${health.risk} / ${health.growth}`} />
          </div>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Executive KPI strip
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {eic.kpis.slice(0, 6).map((k) => (
                <KpiCard key={k.kpiId} snapshot={k} />
              ))}
            </div>
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Visualization previews
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {eic.charts
                .filter((c) => c.kind !== "heatmap")
                .slice(0, 4)
                .map((chart) => {
                  const series = eic.series.find((s) =>
                    chart.seriesIds.includes(s.id),
                  );
                  return (
                    <div
                      key={chart.id}
                      className="rounded-2xl border p-3"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)",
                      }}
                    >
                      <p className="mb-2 text-xs font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                        {chart.title} · {chart.kind}
                      </p>
                      {series ? <MiniChart points={series.points} /> : (
                        <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                          No series bound
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>
        </>
      ) : null}

      {tab === "health" && health ? (
        <Card className="space-y-4" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Business health decomposition
          </h2>
          <HealthBar label="Overall" value={health.overall} />
          <HealthBar label="Revenue" value={health.revenue} />
          <HealthBar label="Customers" value={health.customers} />
          <HealthBar label="Projects" value={health.projects} />
          <HealthBar label="Workflows" value={health.workflows} />
          <HealthBar label="AI" value={health.ai} />
          <HealthBar label="Finance" value={health.finance} />
          <HealthBar label="Operations" value={health.operations} />
          <HealthBar label="Risk posture" value={health.risk} />
          <HealthBar label="Growth" value={health.growth} />
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Observability: {eic.observability.businessMetricsCount} metrics ·{" "}
            {eic.observability.avgQueryMs}ms avg · system health{" "}
            {eic.observability.systemHealth}
          </p>
        </Card>
      ) : null}

      {tab === "workspace" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {eic.domains.map((d) => {
            const domainSeries = eic.series.filter((s) => s.domain === d.domain);
            return (
              <Card key={d.domain} className="space-y-2" padding="20px" hover={false}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {d.label}
                </h3>
                {domainSeries[0] ? (
                  <MiniChart points={domainSeries[0].points} />
                ) : null}
                <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {domainSeries.map((s) => s.label).join(" · ") || "No series"}
                </p>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "kpis" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            KPI Center
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Configurable KPI catalog across revenue, customers, projects, workflows,
            agents, and automation.
          </p>
          <DataTable
            columns={kpiColumns}
            rows={[...eic.kpis]}
            rowKey={(r) => r.kpiId}
            emptyTitle="No KPIs"
            emptyDescription="Refresh the intelligence workspace."
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "reports" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Reporting engine
          </h2>
          <DataTable
            columns={reportColumns}
            rows={[...eic.reports]}
            rowKey={(r) => r.id}
            emptyTitle="No reports"
            emptyDescription="Reports seed on workspace bootstrap."
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "insights" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {eic.insights.map((i) => (
            <Card key={i.id} className="space-y-2" padding="20px" hover={false}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                {i.kind} · {i.domain} · conf {i.confidence}
              </p>
              <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {i.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {i.summary}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "forecasts" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {eic.forecasts.map((f) => (
            <Card key={f.id} className="space-y-2" padding="20px" hover={false}>
              <h3 className="text-sm font-semibold capitalize" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {f.kind.replace("_", " ")} forecast
              </h3>
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Baseline {f.baseline.toLocaleString()} → projected{" "}
                {f.projected.toLocaleString()} ({f.horizonDays}d)
              </p>
              <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Confidence {f.confidence} — {f.note}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "alerts" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Alert engine
          </h2>
          <DataTable
            columns={alertColumns}
            rows={[...eic.alerts]}
            rowKey={(r) => r.id}
            emptyTitle="No alerts"
            emptyDescription="Alerts seed from risk heuristics."
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "scorecards" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Scorecard engine
          </h2>
          <DataTable
            columns={scoreColumns}
            rows={[...eic.scorecards]}
            rowKey={(r) => r.id}
            emptyTitle="No scorecards"
            emptyDescription="Scorecards seed on bootstrap."
            minWidth={640}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eic.scorecards.map((s) => (
              <div key={s.id} className="space-y-2">
                <HealthBar label={s.name} value={s.score} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "explorer" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Data explorer
          </h2>
          <input
            value={explorerQuery}
            onChange={(e) => setExplorerQuery(e.target.value)}
            placeholder="Search · group · aggregate ready"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={fieldStyle}
          />
          <DataTable
            columns={explorerColumns}
            rows={[...explorerRows]}
            rowKey={(r) => r.id}
            emptyTitle="No rows"
            emptyDescription="Adjust filters or search query."
            minWidth={720}
          />
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Drill-down architecture ready — rows are domain/entity/dimension/measure
            tuples for future backend aggregation.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function formatKpi(snapshot: KpiSnapshot): string {
  const def = getKpiDefinition(snapshot.kpiId);
  if (!def) return String(snapshot.value);
  if (def.format === "currency") {
    return `$${Math.round(snapshot.value).toLocaleString()}`;
  }
  if (def.format === "percent") return `${snapshot.value}%`;
  return String(snapshot.value);
}

function KpiCard({ snapshot }: { snapshot: KpiSnapshot }): JSX.Element {
  const def = getKpiDefinition(snapshot.kpiId);
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor:
          "color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)",
      }}
    >
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {def?.name ?? snapshot.kpiId}
      </p>
      <p className="text-xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {formatKpi(snapshot)}
      </p>
      <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {snapshot.trend}
        {snapshot.deltaPercent != null
          ? ` · ${snapshot.deltaPercent > 0 ? "+" : ""}${snapshot.deltaPercent}%`
          : ""}
      </p>
    </div>
  );
}

function HealthBar({
  label,
  value,
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{
          background:
            "color-mix(in srgb, var(--agx-border, #334155) 40%, transparent)",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: "var(--agx-accent, #22d3ee)",
          }}
        />
      </div>
    </div>
  );
}

function MiniChart({
  points,
}: {
  points: readonly { readonly t: string; readonly v: number }[];
}): JSX.Element {
  const normalized = normalizeSeries(points);
  return (
    <div className="flex h-16 items-end gap-1">
      {normalized.map((p) => (
        <div
          key={p.t}
          className="flex-1 rounded-t"
          title={`${p.t}: ${p.v}`}
          style={{
            height: `${Math.max(8, p.pct)}%`,
            background:
              "color-mix(in srgb, var(--agx-accent, #22d3ee) 55%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card className="space-y-1" padding="16px" hover={false}>
      <p
        className="text-[11px] uppercase tracking-wide"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </p>
      <p className="text-xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </p>
    </Card>
  );
}

const fieldStyle = {
  background:
    "color-mix(in srgb, var(--agx-surface, #0f172a) 80%, transparent)",
  borderColor:
    "color-mix(in srgb, var(--agx-border, #334155) 70%, transparent)",
  color: "var(--agx-text, #f8fafc)",
} as const;
