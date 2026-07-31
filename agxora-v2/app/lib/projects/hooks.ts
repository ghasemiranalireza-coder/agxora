"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { computeProjectAnalytics, type ProjectAnalytics } from "./analytics";
import { projectRepository } from "./repository";
import { projectStore, type ProjectStoreSnapshot } from "./store";
import type { ProjectRecord, TaskRecord } from "./types";

function subscribeStore(onStoreChange: () => void): () => void {
  return projectStore.subscribe(onStoreChange);
}

export function useProjectStore(): ProjectStoreSnapshot {
  return useSyncExternalStore(
    subscribeStore,
    projectStore.getSnapshot,
    projectStore.getSnapshot,
  );
}

/**
 * Subscribe to a slice of the project store. Skips React updates when the
 * selected value is equal (default: Object.is).
 */
export function useProjectStoreSelector<T>(
  selector: (snapshot: ProjectStoreSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const [selected, setSelected] = useState(() =>
    selector(projectStore.getSnapshot()),
  );

  useEffect(() => {
    const sync = (): void => {
      const next = selector(projectStore.getSnapshot());
      setSelected((prev) => (isEqual(prev, next) ? prev : next));
    };
    sync();
    const unsubscribe = projectStore.subscribe(sync);
    return () => {
      unsubscribe();
    };
  }, [selector, isEqual]);

  return selected;
}

export function shallowEqualRecord(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (const key of keys) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

let filteredCacheKey = "";
let filteredCache: {
  readonly rows: readonly ProjectRecord[];
  readonly total: number;
  readonly pageRows: readonly ProjectRecord[];
  readonly page: number;
  readonly customers: readonly string[];
  readonly owners: readonly string[];
} | null = null;

function computeFiltered(state: ProjectStoreSnapshot) {
  const key = [
    state.items.map((row) => `${row.id}:${row.updatedAt}`).join(","),
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
  ].join("|");

  if (filteredCache && filteredCacheKey === key) {
    return filteredCache;
  }

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

  filteredCacheKey = key;
  filteredCache = { rows, total, pageRows, page, customers, owners };
  return filteredCache;
}

const selectFiltered = (state: ProjectStoreSnapshot) => computeFiltered(state);

export function useFilteredProjects(): {
  readonly rows: readonly ProjectRecord[];
  readonly total: number;
  readonly pageRows: readonly ProjectRecord[];
  readonly page: number;
  readonly customers: readonly string[];
  readonly owners: readonly string[];
} {
  return useProjectStoreSelector(selectFiltered, Object.is);
}

const selectSelectedProject = (state: ProjectStoreSnapshot): ProjectRecord | null => {
  if (!state.selectedId) return null;
  return state.items.find((row) => row.id === state.selectedId) ?? null;
};

export function useSelectedProject(): ProjectRecord | null {
  return useProjectStoreSelector(selectSelectedProject);
}

export const selectOrganizationId = (s: ProjectStoreSnapshot) => s.organizationId;

export const selectItemsRevision = (s: ProjectStoreSnapshot) =>
  `${s.items.length}:${s.tasks.length}:${s.items.map((row) => row.updatedAt).join(",")}`;

export const selectItems = (s: ProjectStoreSnapshot) => s.items;

export const selectTasks = (s: ProjectStoreSnapshot) => s.tasks;

export const selectHydrated = (s: ProjectStoreSnapshot) => s.hydrated;

export const selectPortfolioCurrency = (s: ProjectStoreSnapshot) =>
  s.items.find((row) => row.budget > 0)?.currency ?? "EUR";

export function useOrgTasks(): readonly TaskRecord[] {
  const organizationId = useProjectStoreSelector(selectOrganizationId);
  const revision = useProjectStoreSelector(selectItemsRevision);
  return useMemo(() => {
    if (!organizationId) return [];
    void revision;
    return projectRepository
      .getDatabase()
      .tasks.filter((task) => task.organizationId === organizationId);
  }, [organizationId, revision]);
}

export function useProjectAnalytics(): ProjectAnalytics {
  const items = useProjectStoreSelector(selectItems);
  const orgTasks = useOrgTasks();
  return useMemo(
    () => computeProjectAnalytics(items, orgTasks),
    [items, orgTasks],
  );
}

export function useProjectTasks(): readonly TaskRecord[] {
  return useProjectStoreSelector(selectTasks);
}

/** Stable selectors for dialogs / list chrome */
export const selectProjectFormSlice = (s: ProjectStoreSnapshot) => ({
  formOpen: s.formOpen,
  formMode: s.formMode,
  draft: s.draft,
  formErrors: s.formErrors,
  saving: s.saving,
});

export const selectProjectDeleteSlice = (s: ProjectStoreSnapshot) => ({
  deleteId: s.deleteId,
  deleting: s.deleting,
  selectedId: s.selectedId,
  projectName: s.items.find((row) => row.id === s.deleteId)?.name ?? null,
});

export const selectProjectListChrome = (s: ProjectStoreSnapshot) => ({
  hydrated: s.hydrated,
  loading: s.loading,
  error: s.error,
  itemsLength: s.items.length,
  organizationId: s.organizationId,
  search: s.search,
  statusFilter: s.statusFilter,
  priorityFilter: s.priorityFilter,
  customerFilter: s.customerFilter,
  ownerFilter: s.ownerFilter,
  dateFrom: s.dateFrom,
  dateTo: s.dateTo,
  viewMode: s.viewMode,
  pageSize: s.pageSize,
});

export const selectProjectSortSlice = (s: ProjectStoreSnapshot) => ({
  sortKey: s.sortKey,
  sortDirection: s.sortDirection,
});
