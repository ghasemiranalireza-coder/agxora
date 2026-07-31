"use client";

import { useMemo, useSyncExternalStore } from "react";
import { computeProjectAnalytics, type ProjectAnalytics } from "./analytics";
import { projectRepository } from "./repository";
import { projectStore, type ProjectStoreSnapshot } from "./store";
import type { ProjectRecord, TaskRecord } from "./types";

export function useProjectStore(): ProjectStoreSnapshot {
  return useSyncExternalStore(
    projectStore.subscribe,
    projectStore.getSnapshot,
    projectStore.getSnapshot,
  );
}

export function useFilteredProjects(): {
  readonly rows: readonly ProjectRecord[];
  readonly total: number;
  readonly pageRows: readonly ProjectRecord[];
  readonly page: number;
  readonly customers: readonly string[];
  readonly owners: readonly string[];
} {
  const state = useProjectStore();

  return useMemo(() => {
    const query = state.search.trim().toLowerCase();
    let rows = state.items.slice();

    if (state.statusFilter !== "all") {
      rows = rows.filter((row) => row.status === state.statusFilter);
    }
    if (state.priorityFilter !== "all") {
      rows = rows.filter((row) => row.priority === state.priorityFilter);
    }
    if (state.customerFilter) {
      rows = rows.filter((row) => row.customer === state.customerFilter);
    }
    if (state.ownerFilter) {
      rows = rows.filter((row) => row.owner === state.ownerFilter);
    }
    if (state.dateFrom) {
      rows = rows.filter(
        (row) => row.startDate && row.startDate.slice(0, 10) >= state.dateFrom,
      );
    }
    if (state.dateTo) {
      rows = rows.filter(
        (row) => row.dueDate && row.dueDate.slice(0, 10) <= state.dateTo,
      );
    }
    if (query) {
      rows = rows.filter((row) => {
        const haystack = [
          row.name,
          row.description,
          row.customer,
          row.owner,
          row.status,
          row.priority,
          row.tags.join(" "),
          ...row.members.map((member) => member.name),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    rows.sort((a, b) => {
      const dir = state.sortDirection === "asc" ? 1 : -1;
      const left = String(a[state.sortKey] ?? "");
      const right = String(b[state.sortKey] ?? "");
      if (state.sortKey === "budget" || state.sortKey === "progress") {
        const ln = Number(a[state.sortKey] ?? 0);
        const rn = Number(b[state.sortKey] ?? 0);
        return (ln - rn) * dir;
      }
      return left.localeCompare(right, undefined, { sensitivity: "base" }) * dir;
    });

    const total = rows.length;
    const maxPage = Math.max(1, Math.ceil(total / state.pageSize) || 1);
    const page = Math.min(state.page, maxPage);
    const start = (page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);

    const customers = Array.from(
      new Set(state.items.map((row) => row.customer).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
    const owners = Array.from(
      new Set(state.items.map((row) => row.owner).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return { rows, total, pageRows, page, customers, owners };
  }, [
    state.items,
    state.search,
    state.statusFilter,
    state.priorityFilter,
    state.customerFilter,
    state.ownerFilter,
    state.dateFrom,
    state.dateTo,
    state.sortKey,
    state.sortDirection,
    state.page,
    state.pageSize,
  ]);
}

export function useSelectedProject(): ProjectRecord | null {
  const state = useProjectStore();
  return useMemo(
    () => state.items.find((row) => row.id === state.selectedId) ?? null,
    [state.items, state.selectedId],
  );
}

export function useOrgTasks(): readonly TaskRecord[] {
  const state = useProjectStore();
  if (!state.organizationId) return [];
  // Re-read on every store snapshot change (items/tasks bump the snapshot).
  void state.items;
  void state.tasks;
  return projectRepository
    .getDatabase()
    .tasks.filter((task) => task.organizationId === state.organizationId);
}

export function useProjectAnalytics(): ProjectAnalytics {
  const state = useProjectStore();
  const orgTasks = useOrgTasks();
  return useMemo(
    () => computeProjectAnalytics(state.items, orgTasks),
    [state.items, orgTasks],
  );
}

export function useProjectTasks(): readonly TaskRecord[] {
  const state = useProjectStore();
  return state.tasks;
}
