/**
 * Intelligence service — orchestration independent of UI.
 */

import { KPI_CATALOG, seedKpiSnapshots } from "../kpi";
import { collectAllSeries, listDomainProviders } from "../domains";
import { defaultFilter, mergeFilter } from "../filters";
import { acknowledgeAlert, seedAlerts } from "../alerts";
import { seedScorecards } from "../scorecards";
import { seedForecasts } from "../forecasts";
import { seedInsights } from "../insights";
import { exportReportPlaceholder, seedReports } from "../reporting";
import { seedExplorerRows } from "../explorer";
import { defaultExecutiveCharts } from "../visualization";
import { computeBusinessHealth } from "../health";
import { intelligenceStore } from "../store";
import type {
  AnalyticsFilter,
  IntelligenceSettings,
  ReportDefinition,
} from "../types";
import { DEFAULT_INTELLIGENCE_SETTINGS } from "../types";

export const intelligenceService = {
  ensureWorkspace(organizationId: string): void {
    intelligenceStore.hydrate();
    if (!intelligenceStore.getSettings(organizationId)) {
      intelligenceStore.setSettings({
        organizationId,
        ...DEFAULT_INTELLIGENCE_SETTINGS,
      });
    }
    if (!intelligenceStore.getFilter(organizationId)) {
      intelligenceStore.setFilter(defaultFilter(organizationId));
    }

    const snap = intelligenceStore.getSnapshot();
    const hasOrg = snap.kpis.some((k) => k.organizationId === organizationId);
    if (!hasOrg) {
      this.refresh(organizationId);
    }
  },

  refresh(organizationId: string): void {
    const kpis = [...seedKpiSnapshots(organizationId)];
    const series = [...collectAllSeries(organizationId)];
    const alerts = [...seedAlerts(organizationId)];
    const scorecards = [...seedScorecards(organizationId)];
    const reports = [...seedReports(organizationId)];
    const forecasts = [...seedForecasts(organizationId)];
    const insights = [...seedInsights(organizationId)];
    const explorerRows = [...seedExplorerRows(organizationId)];
    const charts = [...defaultExecutiveCharts(series)];

    const full = intelligenceStore.getSnapshot();
    intelligenceStore.replaceWorkspace({
      kpis: [
        ...full.kpis.filter((k) => k.organizationId !== organizationId),
        ...kpis,
      ],
      series: [...series],
      alerts: [
        ...full.alerts.filter((a) => a.organizationId !== organizationId),
        ...alerts,
      ],
      scorecards: [
        ...full.scorecards.filter((s) => s.organizationId !== organizationId),
        ...scorecards,
      ],
      reports: [
        ...full.reports.filter((r) => r.organizationId !== organizationId),
        ...reports,
      ],
      forecasts: [
        ...full.forecasts.filter((f) => f.organizationId !== organizationId),
        ...forecasts,
      ],
      insights: [
        ...full.insights.filter((i) => i.organizationId !== organizationId),
        ...insights,
      ],
      explorerRows: [...explorerRows],
      charts: [...charts],
    });
  },

  listKpiCatalog() {
    return KPI_CATALOG;
  },

  listDomains() {
    return listDomainProviders();
  },

  getHealth(organizationId: string) {
    const kpis = intelligenceStore
      .getSnapshot()
      .kpis.filter((k) => k.organizationId === organizationId);
    return computeBusinessHealth(organizationId, kpis);
  },

  getFilter(organizationId: string): AnalyticsFilter {
    return (
      intelligenceStore.getFilter(organizationId) ??
      defaultFilter(organizationId)
    );
  },

  updateFilter(
    organizationId: string,
    patch: Partial<AnalyticsFilter>,
  ): AnalyticsFilter {
    const next = mergeFilter(this.getFilter(organizationId), {
      ...patch,
      organizationId,
    });
    intelligenceStore.setFilter(next);
    return next;
  },

  acknowledgeAlert(alertId: string): void {
    const alert = intelligenceStore
      .getSnapshot()
      .alerts.find((a) => a.id === alertId);
    if (!alert) return;
    intelligenceStore.upsertAlert(acknowledgeAlert(alert));
  },

  exportReport(report: ReportDefinition, format: "pdf" | "csv" | "xlsx") {
    return exportReportPlaceholder(report, format);
  },

  getSettings(organizationId: string): IntelligenceSettings {
    return (
      intelligenceStore.getSettings(organizationId) ?? {
        organizationId,
        ...DEFAULT_INTELLIGENCE_SETTINGS,
      }
    );
  },

  saveSettings(settings: IntelligenceSettings): void {
    intelligenceStore.setSettings(settings);
  },
};
