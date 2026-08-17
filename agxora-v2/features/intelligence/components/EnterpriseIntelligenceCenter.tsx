"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { catalogCopy, slugLabel, useT } from "@/app/lib/i18n";
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

type ExplorerRowView = DataExplorerRow & {
  displayDomain: string;
  displayLabel: string;
};

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

/**
 * {t("intelligence.eyebrow")} workspace.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function EnterpriseIntelligenceCenter(): JSX.Element {
  const t = useT();
  const eic = useEnterpriseIntelligence();
  const [tab, setTab] = useState<TabId>("executive");
  const [notice, setNotice] = useState(t("intelligence.noticeDefault"));
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

  const tabs: readonly { id: TabId; label: string }[] = [
    { id: "executive", label: t("intelligence.tabs.executive") },
    { id: "health", label: t("intelligence.tabs.health") },
    { id: "workspace", label: t("intelligence.tabs.workspace") },
    { id: "kpis", label: t("intelligence.tabs.kpis") },
    { id: "reports", label: t("intelligence.tabs.reports") },
    { id: "insights", label: t("intelligence.tabs.insights") },
    { id: "forecasts", label: t("intelligence.tabs.forecasts") },
    { id: "alerts", label: t("intelligence.tabs.alerts") },
    { id: "scorecards", label: t("intelligence.tabs.scorecards") },
    { id: "explorer", label: t("intelligence.tabs.explorer") },
  ];

  const filterFrom = dateFrom || eic.filter.dateFrom || "";
  const filterTo = dateTo || eic.filter.dateTo || "";

  const explorerRows = useMemo(() => {
    const withLabels = eic.explorerRows.map((r) => {
      const domainLabel = catalogCopy(t, `intelligence.domains.${r.domain}`, r.domain);
      const index = /_entity_(\d+)$/.exec(r.entity)?.[1] ?? "";
      return {
        ...r,
        displayDomain: domainLabel,
        displayLabel: t("intelligence.explorer.metricLabel", {
          domain: domainLabel,
          index,
        }),
      };
    });
    const q = explorerQuery.trim().toLowerCase();
    const searched = !q
      ? withLabels
      : withLabels.filter(
          (r) =>
            r.displayLabel.toLowerCase().includes(q) ||
            r.displayDomain.toLowerCase().includes(q) ||
            r.entity.toLowerCase().includes(q) ||
            r.domain.includes(q),
        );
    if (domainFilter === "all") return searched;
    return searched.filter((r) => r.domain === domainFilter);
  }, [eic.explorerRows, explorerQuery, domainFilter, t]);

  if (!eic.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("intelligence.loading")}
      </div>
    );
  }

  if (!eic.permissions.canRead) {
    return (
      <Card padding="24px" hover={false}>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("intelligence.noPermission")}
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
    setNotice(t("intelligence.filtersUpdated"));
  };

  const kpiColumns: DataTableColumn<KpiSnapshot>[] = [
    {
      key: "name",
      header: t("intelligence.columns.kpi"),
      render: (r) => catalogCopy(t, `intelligence.kpis.${r.kpiId}.name`, getKpiDefinition(r.kpiId)?.name ?? r.kpiId),
    },
    {
      key: "value",
      header: t("intelligence.columns.value"),
      render: (r) => formatKpi(r),
    },
    {
      key: "delta",
      header: t("intelligence.columns.delta"),
      render: (r) =>
        r.deltaPercent == null ? t("intelligence.emDash") : `${r.deltaPercent > 0 ? "+" : ""}${r.deltaPercent}%`,
    },
    { key: "trend", header: t("intelligence.columns.trend"), render: (r) => catalogCopy(t, `intelligence.trend.${r.trend}`, r.trend) },
    {
      key: "target",
      header: t("intelligence.columns.target"),
      render: (r) => (r.target == null ? t("intelligence.emDash") : String(r.target)),
    },
  ];

  const alertColumns: DataTableColumn<IntelligenceAlert>[] = [
    {
      key: "severity",
      header: t("intelligence.columns.severity"),
      render: (r) => catalogCopy(t, `intelligence.severity.${r.severity}`, r.severity),
    },
    {
      key: "title",
      header: t("intelligence.columns.alert"),
      render: (r) => catalogCopy(t, `intelligence.alerts.${r.kind}.title`, r.title),
    },
    {
      key: "domain",
      header: t("intelligence.columns.domain"),
      render: (r) => catalogCopy(t, `intelligence.domains.${r.domain}`, r.domain),
    },
    {
      key: "ack",
      header: t("intelligence.columns.status"),
      render: (r) => (r.acknowledged ? t("intelligence.alerts.acked") : t("intelligence.alerts.open")),
    },
    {
      key: "actions",
      header: t("intelligence.columns.actions"),
      render: (r) =>
        r.acknowledged ? (
          t("intelligence.emDash")
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              intelligenceService.acknowledgeAlert(r.id);
              setNotice(
                t("intelligence.acknowledged", {
                  title: catalogCopy(t, `intelligence.alerts.${r.kind}.title`, r.title),
                }),
              );
            }}
          >
            {t("intelligence.alerts.acknowledge")}
          </Button>
        ),
    },
  ];

  const reportColumns: DataTableColumn<ReportDefinition>[] = [
    {
      key: "title",
      header: t("intelligence.columns.report"),
      render: (r) => catalogCopy(t, `intelligence.reports.${r.kind}.title`, r.title),
    },
    {
      key: "kind",
      header: t("intelligence.columns.kind"),
      render: (r) => catalogCopy(t, `intelligence.reportKinds.${r.kind}`, r.kind),
    },
    {
      key: "schedule",
      header: t("intelligence.columns.schedule"),
      render: (r) => r.scheduleCron ?? t("intelligence.reports.scheduleOnDemand"),
    },
    {
      key: "export",
      header: t("intelligence.columns.export"),
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.exportFormats.map((f) => (
            <Button
              key={f}
              size="sm"
              variant="ghost"
              disabled
              title={t("intelligence.exportUnavailableTitle")}
              aria-label={t("intelligence.exportUnavailableAria", {
                title: catalogCopy(t, `intelligence.reports.${r.kind}.title`, r.title),
                format: f,
              })}
              onClick={() => {
                const res = intelligenceService.exportReport(r, f);
                setNotice(res.reason);
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
    {
      key: "name",
      header: t("intelligence.columns.scorecard"),
      render: (r) => catalogCopy(t, `intelligence.scorecards.${r.id}.name`, r.name),
    },
    { key: "score", header: t("intelligence.columns.score"), render: (r) => String(r.score) },
    {
      key: "drivers",
      header: t("intelligence.columns.topDriver"),
      render: (r) =>
        r.drivers[0]
          ? catalogCopy(
              t,
              `intelligence.scorecards.${r.id}.drivers.${slugLabel(r.drivers[0].label)}`,
              r.drivers[0].label,
            )
          : t("intelligence.emDash"),
    },
  ];

  const explorerColumns: DataTableColumn<ExplorerRowView>[] = [
    { key: "domain", header: t("intelligence.columns.domain"), render: (r) => r.displayDomain },
    { key: "label", header: t("intelligence.columns.label"), render: (r) => r.displayLabel },
    { key: "entity", header: t("intelligence.columns.entity"), render: (r) => r.entity },
    { key: "measure", header: t("intelligence.columns.measure"), render: (r) => String(r.measure) },
    { key: "at", header: t("intelligence.columns.date"), render: (r) => r.at },
  ];

  const health = eic.health;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("intelligence.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("intelligence.title")}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("intelligence.subtitle")}
        </p>
        <div
          role="status"
          className="rounded-xl border px-3 py-2 text-xs leading-relaxed"
          style={{
            borderColor:
              "color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)",
            background:
              "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)",
            color: "var(--agx-text, #f8fafc)",
          }}
        >
          {t("intelligence.demoBanner")}
        </div>
        <p
          className="text-xs"
          role="status"
          aria-live="polite"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {notice}
        </p>
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("intelligence.filters.from")}
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="agx-ui-control mt-1 block min-h-9 min-w-[9.5rem] rounded-lg border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("intelligence.filters.to")}
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="agx-ui-control mt-1 block min-h-9 min-w-[9.5rem] rounded-lg border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("intelligence.filters.domain")}
            <select
              value={domainFilter}
              onChange={(e) =>
                setDomainFilter(e.target.value as AnalyticsDomain | "all")
              }
              className="agx-ui-control mt-1 block min-h-9 min-w-[10rem] rounded-lg border px-2 py-1.5 text-sm"
            >
              <option value="all">{t("intelligence.filters.allDomains")}</option>
              {eic.domains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {catalogCopy(t, `intelligence.domains.${d.domain}`, d.label)}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="secondary" onClick={applyDates}>
            {t("intelligence.filters.apply")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              intelligenceService.refresh(eic.organizationId);
              setNotice(t("intelligence.demoReloaded"));
            }}
          >
            {t("intelligence.filters.reloadDemo")}
          </Button>
        </div>
        <div
          className="flex flex-wrap gap-2 pt-1"
          role="tablist"
          aria-label={t("intelligence.filters.viewsAria")}
        >
          {tabs.map((tabItem) => (
            <Button
              key={tabItem.id}
              size="sm"
              variant={tab === tabItem.id ? "primary" : "secondary"}
              aria-pressed={tab === tabItem.id}
              onClick={() => setTab(tabItem.id)}
            >
              {tabItem.label}
            </Button>
          ))}
        </div>
      </Card>

      {tab === "executive" && health ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("intelligence.executive.companyHealth")} value={`${health.overall}`} />
            <Stat label={t("intelligence.executive.revenueScore")} value={`${health.revenue}`} />
            <Stat label={t("intelligence.executive.customerHealth")} value={`${health.customers}`} />
            <Stat label={t("intelligence.executive.projectHealth")} value={`${health.projects}`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("intelligence.executive.workflowSuccess")} value={`${health.workflows}`} />
            <Stat label={t("intelligence.executive.aiActivity")} value={`${health.ai}`} />
            <Stat label={t("intelligence.executive.finance")} value={`${health.finance}`} />
            <Stat label={t("intelligence.executive.riskGrowth")} value={`${health.risk} / ${health.growth}`} />
          </div>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("intelligence.executive.kpiStrip")}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {eic.kpis.slice(0, 6).map((k) => (
                <KpiCard key={k.kpiId} snapshot={k} />
              ))}
            </div>
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("intelligence.executive.visualizationPreviews")}
            </h2>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("intelligence.executive.visualizationHint")}
            </p>
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
                        {catalogCopy(t, `intelligence.charts.${chart.id}`, chart.title)} ·{" "}
                        {catalogCopy(t, `intelligence.chartKinds.${chart.kind}`, chart.kind)}
                      </p>
                      {series ? <MiniChart points={series.points} /> : (
                        <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                          {t("intelligence.executive.noSeries")}
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
            {t("intelligence.health.title")}
          </h2>
          <HealthBar label={t("intelligence.health.overall")} value={health.overall} />
          <HealthBar label={t("intelligence.health.revenue")} value={health.revenue} />
          <HealthBar label={t("intelligence.health.customers")} value={health.customers} />
          <HealthBar label={t("intelligence.health.projects")} value={health.projects} />
          <HealthBar label={t("intelligence.health.workflows")} value={health.workflows} />
          <HealthBar label={t("intelligence.health.ai")} value={health.ai} />
          <HealthBar label={t("intelligence.executive.finance")} value={health.finance} />
          <HealthBar label={t("intelligence.health.operations")} value={health.operations} />
          <HealthBar label={t("intelligence.health.riskPosture")} value={health.risk} />
          <HealthBar label={t("intelligence.health.growth")} value={health.growth} />
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("intelligence.health.observability", {
              metrics: eic.observability.businessMetricsCount,
              avgMs: eic.observability.avgQueryMs,
              health: eic.observability.systemHealth,
            })}
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
                  {catalogCopy(t, `intelligence.domains.${d.domain}`, d.label)}
                </h3>
                {domainSeries[0] ? (
                  <MiniChart points={domainSeries[0].points} />
                ) : null}
                <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {domainSeries
                    .map((s) => catalogCopy(t, `intelligence.series.${s.id}`, s.label))
                    .join(" · ") || t("intelligence.workspace.noSeries")}
                </p>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "kpis" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("intelligence.kpis.title")}
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("intelligence.kpis.subtitle")}
          </p>
          <DataTable
            columns={kpiColumns}
            rows={[...eic.kpis]}
            rowKey={(r) => r.kpiId}
            emptyTitle={t("intelligence.kpis.emptyTitle")}
            emptyDescription={t("intelligence.kpis.emptyDescription")}
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "reports" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("intelligence.reports.title")}
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("intelligence.reports.subtitle")}
          </p>
          <DataTable
            columns={reportColumns}
            rows={[...eic.reports]}
            rowKey={(r) => r.id}
            emptyTitle={t("intelligence.reports.emptyTitle")}
            emptyDescription={t("intelligence.reports.emptyDescription")}
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "insights" ? (
        eic.insights.length === 0 ? (
          <Card padding="20px" hover={false}>
            <p className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("intelligence.insights.emptyTitle")}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("intelligence.insights.emptyDescription")}
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {eic.insights.map((i) => (
              <Card key={i.id} className="space-y-2" padding="20px" hover={false}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                  {t("intelligence.insights.badge", {
                    kind: catalogCopy(t, `intelligence.insightKinds.${i.kind}`, i.kind),
                    domain: catalogCopy(t, `intelligence.domains.${i.domain}`, i.domain),
                    confidence: i.confidence,
                  })}
                </p>
                <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {catalogCopy(t, `intelligence.insightItems.${i.kind}.title`, i.title)}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {catalogCopy(t, `intelligence.insightItems.${i.kind}.summary`, i.summary)}
                </p>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "forecasts" ? (
        eic.forecasts.length === 0 ? (
          <Card padding="20px" hover={false}>
            <p className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("intelligence.forecasts.emptyTitle")}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("intelligence.forecasts.emptyDescription")}
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eic.forecasts.map((f) => (
              <Card key={f.id} className="space-y-2" padding="20px" hover={false}>
                <h3 className="text-sm font-semibold capitalize" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {t("intelligence.forecasts.title", {
                    kind: catalogCopy(t, `intelligence.forecastKinds.${f.kind}`, f.kind.replace("_", " ")),
                  })}
                </h3>
                <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("intelligence.forecasts.baseline", {
                    baseline: f.baseline.toLocaleString(),
                    projected: f.projected.toLocaleString(),
                    days: f.horizonDays,
                  })}
                </p>
                <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("intelligence.forecasts.confidence", {
                    confidence: f.confidence,
                    note: catalogCopy(t, `intelligence.forecastNotes.${f.kind}`, f.note),
                  })}
                </p>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "alerts" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("intelligence.alerts.title")}
          </h2>
          <DataTable
            columns={alertColumns}
            rows={[...eic.alerts]}
            rowKey={(r) => r.id}
            emptyTitle={t("intelligence.alerts.emptyTitle")}
            emptyDescription={t("intelligence.alerts.emptyDescription")}
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "scorecards" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("intelligence.scorecards.title")}
          </h2>
          <DataTable
            columns={scoreColumns}
            rows={[...eic.scorecards]}
            rowKey={(r) => r.id}
            emptyTitle={t("intelligence.scorecards.emptyTitle")}
            emptyDescription={t("intelligence.scorecards.emptyDescription")}
            minWidth={640}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eic.scorecards.map((s) => (
              <div key={s.id} className="space-y-2">
                <HealthBar
                  label={catalogCopy(t, `intelligence.scorecards.${s.id}.name`, s.name)}
                  value={s.score}
                />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "explorer" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("intelligence.explorer.title")}
          </h2>
          <input
            value={explorerQuery}
            onChange={(e) => setExplorerQuery(e.target.value)}
            placeholder={t("intelligence.explorer.searchPlaceholder")}
            aria-label={t("intelligence.explorer.searchAria")}
            className="agx-ui-control w-full rounded-xl border px-3 py-2 text-sm"
          />
          <DataTable
            columns={explorerColumns}
            rows={[...explorerRows]}
            rowKey={(r) => r.id}
            emptyTitle={t("intelligence.explorer.emptyTitle")}
            emptyDescription={t("intelligence.explorer.emptyDescription")}
            minWidth={720}
          />
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("intelligence.explorer.hint")}
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
  const t = useT();
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
        {catalogCopy(t, `intelligence.kpis.${snapshot.kpiId}.name`, def?.name ?? snapshot.kpiId)}
      </p>
      <p className="text-xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {formatKpi(snapshot)}
      </p>
      <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {catalogCopy(t, `intelligence.trend.${snapshot.trend}`, snapshot.trend)}
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

