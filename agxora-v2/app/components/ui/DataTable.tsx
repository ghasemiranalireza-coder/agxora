"use client";

import type { JSX, ReactNode } from "react";
import { useT } from "../../lib/i18n";
import { EmptyState } from "./States";
import { Button } from "./Button";
import { UI } from "./tokens";

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly align?: "left" | "right";
  readonly render: (row: T) => ReactNode;
  readonly width?: string;
  readonly sortable?: boolean;
}

export interface DataTableProps<T> {
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly minWidth?: number;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly toolbar?: ReactNode;
  readonly page?: number;
  readonly pageSize?: number;
  readonly onPageChange?: (page: number) => void;
  readonly totalCount?: number;
  /** When set, `rows` are treated as the current page slice (no internal slice). */
  readonly serverPaginated?: boolean;
  readonly sortKey?: string;
  readonly sortDirection?: "asc" | "desc";
  readonly onSort?: (key: string) => void;
  readonly onRowClick?: (row: T) => void;
}

/**
 * Shared enterprise table — identical rhythm across CRM, Customers, Finance.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 720,
  emptyTitle,
  emptyDescription,
  toolbar,
  page = 1,
  pageSize = 25,
  onPageChange,
  totalCount,
  serverPaginated = false,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
}: DataTableProps<T>): JSX.Element {
  const t = useT();
  const resolvedEmptyTitle = emptyTitle ?? t("ui.table.noResults");
  const resolvedEmptyDescription =
    emptyDescription ?? t("ui.table.noResultsDescription");
  const total = totalCount ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageRows = serverPaginated
    ? rows
    : rows.slice(start, start + pageSize);

  return (
    <div className="agx-ui-stack">
      {toolbar ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {toolbar}
        </div>
      ) : null}

      {pageRows.length === 0 ? (
        <EmptyState title={resolvedEmptyTitle} description={resolvedEmptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="agx-ui-table" style={{ minWidth }}>
            <thead>
              <tr>
                {columns.map((col) => {
                  const active = sortKey === col.key;
                  const canSort = Boolean(col.sortable && onSort);
                  return (
                    <th
                      key={col.key}
                      style={{
                        textAlign: col.align ?? "left",
                        width: col.width,
                      }}
                      aria-sort={
                        canSort && active
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : canSort
                            ? "none"
                            : undefined
                      }
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={() => onSort?.(col.key)}
                          className="agx-ui-table-sort uppercase tracking-[0.12em]"
                        >
                          {col.header}
                          <span aria-hidden="true" className="text-[10px] opacity-70">
                            {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  style={{
                    cursor: onRowClick ? "pointer" : undefined,
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align ?? "left" }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onPageChange && total > pageSize ? (
        <div className="flex items-center justify-between gap-4 pt-1">
          <p
            className="text-xs tabular-nums"
            style={{ color: UI.color.textMuted }}
          >
            {t("ui.table.paginationRange", {
              start: Math.min(start + 1, total),
              end: Math.min(start + pageSize, total),
              total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              {t("ui.table.previous")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              {t("ui.table.next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
