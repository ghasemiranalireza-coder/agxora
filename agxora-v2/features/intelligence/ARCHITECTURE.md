# AGXORA Enterprise Intelligence Center (EIC)

## Architecture

```
features/intelligence/
  kpi/              # Centralized configurable KPI engine
  domains/          # CRM · Projects · Finance · Documents · Workflow · Identity · AI · Integration
  filters/          # Universal date/workspace/org/customer/project/user filters
  alerts/           # Revenue · delay · churn · workflow · AI · integration · security
  scorecards/       # Sales · customer · project · automation · AI · operations
  forecasts/        # Revenue/customer/project/capacity/growth placeholders
  insights/         # Trend · pattern · recommendation · summary · risk · opportunity
  reporting/        # Executive · department · operational · management + export stubs
  explorer/         # Search · group · aggregate · sort · drill-down ready
  visualization/    # Card · table · line · bar · area · pie · heatmap placeholder
  health/           # Company health score composition
  observability/    # Business · usage · performance · system health · errors
  security/         # RBAC visibility + workspace isolation
  repositories/     # LocalStorage now · REST later
  store/            # Persisted intelligence state
  services/         # intelligenceService (UI-independent)
  hooks/            # useEnterpriseIntelligence
  providers/        # IntelligenceBridge
  components/       # EnterpriseIntelligenceCenter
```

Analytics never depend on UI. Domains register via `registerDomainProvider`.

## KPI Engine

`KPI_CATALOG` + `buildKpiSnapshot` / `seedKpiSnapshots`. Configurable KPIs span revenue, MRR/ARR, growth, acquisition, retention, churn, project/workflow/agent/automation success, and custom.

## Visualization System

`ChartSpec` describes cards, tables, line/bar/area/pie charts, and heatmap placeholders. `normalizeSeries` supports lightweight UI rendering without chart SDK coupling.

## Reporting Engine

Report definitions with schedule cron + export format placeholders (`pdf`/`csv`/`xlsx`).

## Future AI Insights

`AiInsight` kinds cover trend detection, patterns, recommendations, executive summary, risk, and opportunity — ready for live models.

## Extension Guide

1. New domain metrics — `registerDomainProvider`.
2. New KPI — add to `KPI_CATALOG` and seed values.
3. Backend — `setIntelligenceRepository(new RestIntelligenceRepository(url))`.
4. Live forecasts — replace `seedForecasts` with model service.

## Route

`/dashboard/analytics` — lazy EIC workspace (existing sidebar Analytics entry).

Dashboard shell (layout, sidebar, header, hero, globe, theme, navigation) is unchanged.
