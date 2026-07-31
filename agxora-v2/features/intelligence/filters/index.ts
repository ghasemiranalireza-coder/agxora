/**
 * Universal analytics filter system.
 */

import type { AnalyticsFilter, DataExplorerRow, KpiSnapshot } from "../types";

export function defaultFilter(organizationId: string): AnalyticsFilter {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);
  return {
    organizationId,
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export function applyFilterToKpis(
  snapshots: readonly KpiSnapshot[],
  filter: AnalyticsFilter,
): readonly KpiSnapshot[] {
  return snapshots.filter((s) => {
    if (filter.organizationId && s.organizationId !== filter.organizationId) {
      return false;
    }
    if (filter.domains && filter.domains.length > 0) {
      // KPI domain filtering is applied at catalog layer by caller when needed
      void filter.domains;
    }
    return true;
  });
}

export function applyFilterToRows(
  rows: readonly DataExplorerRow[],
  filter: AnalyticsFilter,
): readonly DataExplorerRow[] {
  return rows.filter((r) => {
    if (filter.domains && filter.domains.length > 0) {
      if (!filter.domains.includes(r.domain)) return false;
    }
    if (filter.dateFrom && r.at < filter.dateFrom) return false;
    if (filter.dateTo && r.at > filter.dateTo) return false;
    if (filter.customerId && r.entity !== filter.customerId && r.dimension === "customer") {
      return false;
    }
    if (filter.projectId && r.entity !== filter.projectId && r.dimension === "project") {
      return false;
    }
    if (filter.userId && r.entity !== filter.userId && r.dimension === "user") {
      return false;
    }
    return true;
  });
}

export function mergeFilter(
  base: AnalyticsFilter,
  patch: Partial<AnalyticsFilter>,
): AnalyticsFilter {
  return {
    ...base,
    ...patch,
    customGroups: {
      ...(base.customGroups ?? {}),
      ...(patch.customGroups ?? {}),
    },
  };
}
