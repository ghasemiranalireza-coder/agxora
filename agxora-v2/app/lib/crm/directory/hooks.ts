"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { computeCrmAnalytics, type CrmAnalytics } from "./analytics";
import { projectRepository } from "../../projects/repository";
import type { ProjectRecord } from "../../projects/types";
import { crmStore, type CrmStoreSnapshot } from "./store";
import type { CrmCustomerRecord } from "./types";

function subscribeStore(onStoreChange: () => void): () => void {
  return crmStore.subscribe(onStoreChange);
}

export function useCrmStore(): CrmStoreSnapshot {
  return useSyncExternalStore(
    subscribeStore,
    crmStore.getSnapshot,
    crmStore.getSnapshot,
  );
}

export function useCrmStoreSelector<T>(
  selector: (snapshot: CrmStoreSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const [selected, setSelected] = useState(() =>
    selector(crmStore.getSnapshot()),
  );

  useEffect(() => {
    const sync = (): void => {
      const next = selector(crmStore.getSnapshot());
      setSelected((prev) => (isEqual(prev, next) ? prev : next));
    };
    sync();
    const unsubscribe = crmStore.subscribe(sync);
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
  readonly rows: readonly CrmCustomerRecord[];
  readonly total: number;
  readonly pageRows: readonly CrmCustomerRecord[];
  readonly page: number;
  readonly industries: readonly string[];
  readonly owners: readonly string[];
  readonly countries: readonly string[];
  readonly tags: readonly string[];
} | null = null;

function computeFiltered(state: CrmStoreSnapshot) {
  const key = [
    state.items.map((row) => `${row.id}:${row.updatedAt}`).join(","),
    state.search,
    state.statusFilter,
    state.industryFilter,
    state.ownerFilter,
    state.countryFilter,
    state.tagFilter,
    state.sortKey,
    state.sortDirection,
    state.page,
    state.pageSize,
  ].join("|");
  if (filteredCache && filteredCacheKey === key) return filteredCache;

  const query = state.search.trim().toLowerCase();
  let rows = state.items.slice();

  if (state.statusFilter !== "all") {
    rows = rows.filter((row) => row.status === state.statusFilter);
  }
  if (state.industryFilter) {
    rows = rows.filter((row) => row.industry === state.industryFilter);
  }
  if (state.ownerFilter) {
    rows = rows.filter((row) => row.owner === state.ownerFilter);
  }
  if (state.countryFilter) {
    rows = rows.filter((row) => row.country === state.countryFilter);
  }
  if (state.tagFilter) {
    rows = rows.filter((row) =>
      row.tags.some((tag) => tag.label === state.tagFilter),
    );
  }
  if (query) {
    rows = rows.filter((row) => {
      const haystack = [
        row.companyName,
        row.contactName,
        row.email,
        row.phone,
        row.industry,
        row.owner,
        row.country,
        row.city,
        row.tags.map((tag) => tag.label).join(" "),
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
    return left.localeCompare(right, undefined, { sensitivity: "base" }) * dir;
  });

  const total = rows.length;
  const maxPage = Math.max(1, Math.ceil(total / state.pageSize) || 1);
  const page = Math.min(state.page, maxPage);
  const start = (page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);

  const industries = Array.from(
    new Set(state.items.map((row) => row.industry).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const owners = Array.from(
    new Set(state.items.map((row) => row.owner).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const countries = Array.from(
    new Set(state.items.map((row) => row.country).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const tags = Array.from(
    new Set(
      state.items.flatMap((row) => row.tags.map((tag) => tag.label)).filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  filteredCacheKey = key;
  filteredCache = {
    rows,
    total,
    pageRows,
    page,
    industries,
    owners,
    countries,
    tags,
  };
  return filteredCache;
}

const selectFiltered = (state: CrmStoreSnapshot) => computeFiltered(state);

export function useFilteredCrmCustomers() {
  return useCrmStoreSelector(selectFiltered, Object.is);
}

export function useSelectedCrmCustomer(): CrmCustomerRecord | null {
  return useCrmStoreSelector((state) => {
    if (!state.selectedId) return null;
    return state.items.find((row) => row.id === state.selectedId) ?? null;
  });
}

export function useCrmAnalytics(): CrmAnalytics {
  const items = useCrmStoreSelector((s) => s.items);
  return useMemo(() => computeCrmAnalytics(items), [items]);
}

/** Read-only project links by company name — no data duplication. */
export function useCustomerProjects(
  companyName: string | null | undefined,
  organizationId: string | null,
): readonly ProjectRecord[] {
  const revision = useCrmStoreSelector(
    (s) => `${s.items.length}:${s.selectedId ?? ""}`,
  );
  return useMemo(() => {
    void revision;
    if (!companyName || !organizationId || typeof window === "undefined") {
      return [];
    }
    return projectRepository
      .getDatabase()
      .projects.filter(
        (project) =>
          project.organizationId === organizationId &&
          project.customer.trim().toLowerCase() ===
            companyName.trim().toLowerCase(),
      );
  }, [companyName, organizationId, revision]);
}

export const selectCrmFormSlice = (s: CrmStoreSnapshot) => ({
  formOpen: s.formOpen,
  formMode: s.formMode,
  draft: s.draft,
  formErrors: s.formErrors,
  saving: s.saving,
});

export const selectCrmDeleteSlice = (s: CrmStoreSnapshot) => ({
  deleteId: s.deleteId,
  deleting: s.deleting,
  selectedId: s.selectedId,
  companyName:
    s.items.find((row) => row.id === s.deleteId)?.companyName ?? null,
});

export const selectCrmListChrome = (s: CrmStoreSnapshot) => ({
  hydrated: s.hydrated,
  loading: s.loading,
  error: s.error,
  itemsLength: s.items.length,
  organizationId: s.organizationId,
  search: s.search,
  statusFilter: s.statusFilter,
  industryFilter: s.industryFilter,
  ownerFilter: s.ownerFilter,
  countryFilter: s.countryFilter,
  tagFilter: s.tagFilter,
  viewMode: s.viewMode,
  pageSize: s.pageSize,
  sortKey: s.sortKey,
  sortDirection: s.sortDirection,
});
