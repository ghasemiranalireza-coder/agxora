"use client";

import { useMemo, useSyncExternalStore } from "react";
import { customerStore, type CustomerStoreSnapshot } from "./store";
import type { CustomerRecord } from "./types";

export function useCustomerStore(): CustomerStoreSnapshot {
  return useSyncExternalStore(
    customerStore.subscribe,
    customerStore.getSnapshot,
    customerStore.getSnapshot,
  );
}

export function useFilteredCustomers(): {
  readonly rows: readonly CustomerRecord[];
  readonly total: number;
  readonly pageRows: readonly CustomerRecord[];
  readonly page: number;
} {
  const state = useCustomerStore();

  return useMemo(() => {
    const query = state.search.trim().toLowerCase();
    let rows = state.items.slice();

    if (state.statusFilter !== "all") {
      rows = rows.filter((row) => row.status === state.statusFilter);
    }
    if (query) {
      rows = rows.filter((row) => {
        const haystack = [
          row.companyName,
          row.contactPerson,
          row.email,
          row.phone,
          row.city,
          row.country,
          row.tags.join(" "),
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
    return { rows, total, pageRows, page };
  }, [
    state.items,
    state.search,
    state.statusFilter,
    state.sortKey,
    state.sortDirection,
    state.page,
    state.pageSize,
  ]);
}

export function useSelectedCustomer(): CustomerRecord | null {
  const state = useCustomerStore();
  return useMemo(
    () => state.items.find((row) => row.id === state.selectedId) ?? null,
    [state.items, state.selectedId],
  );
}
