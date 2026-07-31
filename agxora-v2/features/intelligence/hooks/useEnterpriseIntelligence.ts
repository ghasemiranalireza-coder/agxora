"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useOrganization } from "@/app/lib/organization";
import { useOptionalAuth } from "@/app/lib/auth";
import { intelligenceStore } from "../store";
import { intelligenceService } from "../services";
import { applyFilterToKpis, applyFilterToRows } from "../filters";
import { searchRows, sortRows } from "../explorer";
import { computeObservability } from "../observability";
import { canIntelligence } from "../security";
import { KPI_CATALOG } from "../kpi";

const LOCAL_ORG = "org_local_default";

export function useIntelligenceOrganizationId(): string {
  const { organization } = useOrganization();
  return organization?.id ?? LOCAL_ORG;
}

export function useEnterpriseIntelligence() {
  const organizationId = useIntelligenceOrganizationId();
  const auth = useOptionalAuth();
  const { session } = useOrganization();
  const snapshot = useSyncExternalStore(
    (l) => intelligenceStore.subscribe(l),
    () => intelligenceStore.getSnapshot(),
    () => intelligenceStore.getSnapshot(),
  );

  const filter = useMemo(() => {
    return (
      snapshot.filters.find((f) => f.organizationId === organizationId) ?? {
        organizationId,
        dateFrom: undefined,
        dateTo: undefined,
      }
    );
  }, [organizationId, snapshot.filters]);

  const kpis = useMemo(() => {
    const all = snapshot.kpis.filter((k) => k.organizationId === organizationId);
    return applyFilterToKpis(all, filter);
  }, [organizationId, snapshot, filter]);

  const alerts = useMemo(
    () =>
      snapshot.alerts.filter((a) => a.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const scorecards = useMemo(
    () =>
      snapshot.scorecards.filter((s) => s.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const reports = useMemo(
    () =>
      snapshot.reports.filter((r) => r.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const forecasts = useMemo(
    () =>
      snapshot.forecasts.filter((f) => f.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const insights = useMemo(
    () =>
      snapshot.insights.filter((i) => i.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const explorerRows = useMemo(() => {
    const filtered = applyFilterToRows(snapshot.explorerRows, filter);
    return sortRows(filtered, "measure", "desc");
  }, [snapshot, filter]);

  const series = snapshot.series;
  const charts = snapshot.charts;

  const health = useMemo(
    () =>
      snapshot.hydrated
        ? intelligenceService.getHealth(organizationId)
        : null,
    [organizationId, snapshot],
  );

  const observability = useMemo(
    () =>
      computeObservability(organizationId, {
        kpiCount: kpis.length,
        seriesCount: series.length,
        alerts,
      }),
    [organizationId, kpis.length, series.length, alerts],
  );

  const role = useMemo(() => {
    const mem = session.memberships.find(
      (m) => m.organizationId === organizationId,
    );
    return (mem?.role ?? "admin").toLowerCase();
  }, [session.memberships, organizationId]);

  const permissions = useMemo(
    () => ({
      canRead: canIntelligence(role, "intelligence.read"),
      canExport: canIntelligence(role, "intelligence.export"),
      canAdmin: canIntelligence(role, "intelligence.admin"),
      canExecutive: canIntelligence(role, "intelligence.executive"),
    }),
    [role],
  );

  return {
    hydrated: snapshot.hydrated,
    organizationId,
    userId: auth?.userId ?? null,
    filter,
    kpis,
    kpiCatalog: KPI_CATALOG,
    series,
    charts,
    alerts,
    scorecards,
    reports,
    forecasts,
    insights,
    explorerRows,
    health,
    observability,
    domains: intelligenceService.listDomains(),
    settings: intelligenceService.getSettings(organizationId),
    permissions,
    searchExplorer: (q: string) => searchRows(explorerRows, q),
  };
}
