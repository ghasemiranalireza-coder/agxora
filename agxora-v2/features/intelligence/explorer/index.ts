/**
 * Data explorer — search, group, aggregate, sort, filter, drill-down ready.
 */

import type { AnalyticsDomain, DataExplorerRow } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function seedExplorerRows(
  organizationId: string,
): readonly DataExplorerRow[] {
  void organizationId;
  const rows: DataExplorerRow[] = [];
  const domains: AnalyticsDomain[] = [
    "crm",
    "projects",
    "finance",
    "documents",
    "workflow",
    "ai",
    "integration",
  ];
  domains.forEach((domain, di) => {
    for (let i = 0; i < 4; i += 1) {
      rows.push({
        id: createId("row"),
        domain,
        entity: `${domain}_entity_${i + 1}`,
        dimension: i % 2 === 0 ? "customer" : "project",
        measure: 10 + di * 7 + i * 3,
        label: `${domain} metric ${i + 1}`,
        at: new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10),
      });
    }
  });
  return rows;
}

export function searchRows(
  rows: readonly DataExplorerRow[],
  query: string,
): readonly DataExplorerRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.label.toLowerCase().includes(q) ||
      r.entity.toLowerCase().includes(q) ||
      r.domain.includes(q),
  );
}

export function groupByDomain(
  rows: readonly DataExplorerRow[],
): Readonly<Record<string, readonly DataExplorerRow[]>> {
  const out: Record<string, DataExplorerRow[]> = {};
  for (const row of rows) {
    (out[row.domain] ??= []).push(row);
  }
  return out;
}

export function aggregateSum(
  rows: readonly DataExplorerRow[],
): number {
  return rows.reduce((s, r) => s + r.measure, 0);
}

export function sortRows(
  rows: readonly DataExplorerRow[],
  key: "measure" | "at" | "label",
  direction: "asc" | "desc" = "desc",
): readonly DataExplorerRow[] {
  const sorted = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av < bv) return direction === "asc" ? -1 : 1;
    if (av > bv) return direction === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}
