/**
 * Intelligence repository — LocalStorage now, REST later.
 */

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

export interface IntelligencePersistedState {
  readonly version: 1;
  readonly kpis: KpiSnapshot[];
  readonly series: DomainMetricSeries[];
  readonly alerts: IntelligenceAlert[];
  readonly scorecards: Scorecard[];
  readonly reports: ReportDefinition[];
  readonly forecasts: ForecastPlaceholder[];
  readonly insights: AiInsight[];
  readonly explorerRows: DataExplorerRow[];
  readonly charts: ChartSpec[];
  readonly filters: AnalyticsFilter[];
  readonly settings: IntelligenceSettings[];
}

export interface IntelligenceRepository {
  load(): IntelligencePersistedState | null;
  save(state: IntelligencePersistedState): void;
}

const STORAGE_KEY = "agxora-enterprise-intelligence-v1";

export class LocalIntelligenceRepository implements IntelligenceRepository {
  load(): IntelligencePersistedState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as IntelligencePersistedState;
    } catch {
      return null;
    }
  }

  save(state: IntelligencePersistedState): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // quota
    }
  }
}

export class RestIntelligenceRepository implements IntelligenceRepository {
  constructor(private readonly baseUrl: string) {
    void this.baseUrl;
  }

  load(): IntelligencePersistedState | null {
    return null;
  }

  save(state: IntelligencePersistedState): void {
    void state;
  }
}

export function emptyIntelligenceState(): IntelligencePersistedState {
  return {
    version: 1,
    kpis: [],
    series: [],
    alerts: [],
    scorecards: [],
    reports: [],
    forecasts: [],
    insights: [],
    explorerRows: [],
    charts: [],
    filters: [],
    settings: [],
  };
}
