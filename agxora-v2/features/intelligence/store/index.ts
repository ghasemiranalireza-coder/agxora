/**
 * Enterprise Intelligence store — repository-backed.
 */

import {
  emptyIntelligenceState,
  LocalIntelligenceRepository,
  type IntelligencePersistedState,
  type IntelligenceRepository,
} from "../repositories";
import type {
  AiInsight,
  AnalyticsFilter,
  ChartSpec,
  DataExplorerRow,
  DomainMetricSeries,
  ForecastPlaceholder,
  IntelligenceAlert,
  IntelligenceSettings,
  KpiSnapshot,
  ReportDefinition,
  Scorecard,
} from "../types";

type Listener = () => void;

const listeners = new Set<Listener>();
let repository: IntelligenceRepository = new LocalIntelligenceRepository();

let state: IntelligencePersistedState & { hydrated: boolean } = {
  ...emptyIntelligenceState(),
  hydrated: false,
};

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  const { hydrated: _h, ...payload } = state;
  void _h;
  repository.save(payload);
}

export function setIntelligenceRepository(
  repo: IntelligenceRepository,
): void {
  repository = repo;
}

export const intelligenceStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): IntelligencePersistedState & { hydrated: boolean } {
    return state;
  },

  hydrate(): void {
    if (state.hydrated) return;
    const loaded = repository.load();
    state = { ...(loaded ?? emptyIntelligenceState()), hydrated: true };
    emit();
  },

  replaceWorkspace(input: {
    readonly kpis: KpiSnapshot[];
    readonly series: DomainMetricSeries[];
    readonly alerts: IntelligenceAlert[];
    readonly scorecards: Scorecard[];
    readonly reports: ReportDefinition[];
    readonly forecasts: ForecastPlaceholder[];
    readonly insights: AiInsight[];
    readonly explorerRows: DataExplorerRow[];
    readonly charts: ChartSpec[];
  }): void {
    state = {
      ...state,
      kpis: input.kpis,
      series: input.series,
      alerts: input.alerts,
      scorecards: input.scorecards,
      reports: input.reports,
      forecasts: input.forecasts,
      insights: input.insights,
      explorerRows: input.explorerRows,
      charts: input.charts,
    };
    persist();
    emit();
  },

  setKpis(kpis: KpiSnapshot[]): void {
    state = { ...state, kpis };
    persist();
    emit();
  },

  upsertAlert(alert: IntelligenceAlert): void {
    const idx = state.alerts.findIndex((a) => a.id === alert.id);
    const alerts = [...state.alerts];
    if (idx >= 0) alerts[idx] = alert;
    else alerts.unshift(alert);
    state = { ...state, alerts };
    persist();
    emit();
  },

  setFilter(filter: AnalyticsFilter): void {
    const rest = state.filters.filter(
      (f) => f.organizationId !== filter.organizationId,
    );
    state = { ...state, filters: [filter, ...rest] };
    persist();
    emit();
  },

  getFilter(organizationId: string): AnalyticsFilter | undefined {
    return state.filters.find((f) => f.organizationId === organizationId);
  },

  setSettings(settings: IntelligenceSettings): void {
    const rest = state.settings.filter(
      (s) => s.organizationId !== settings.organizationId,
    );
    state = { ...state, settings: [settings, ...rest] };
    persist();
    emit();
  },

  getSettings(organizationId: string): IntelligenceSettings | undefined {
    return state.settings.find((s) => s.organizationId === organizationId);
  },
};
