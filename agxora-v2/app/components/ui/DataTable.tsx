"use client";

import type { JSX, ReactNode } from "react";
import { EmptyState } from "./States";
import { Button } from "./Button";

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly align?: "left" | "right";
  readonly render: (row: T) => ReactNode;
  readonly width?: string;
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
}

/**
 * Shared enterprise table — Finance, CRM, and future modules.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 720,
  emptyTitle = "No results",
  emptyDescription = "Nothing matches the current filters.",
  toolbar,
  page = 1,
  pageSize = 25,
  onPageChange,
  totalCount,
}: DataTableProps<T>): JSX.Element {
  const total = totalCount ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div className="space-y-3">
      {toolbar ? <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">{toolbar}</div> : null}

      {pageRows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-left text-sm"
            style={{ minWidth }}
          >
            <thead>
              <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border-b px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                      textAlign: col.align ?? "left",
                      width: col.width,
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="transition-colors hover:bg-white/[0.03]"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="border-b px-3 py-3"
                      style={{
                        borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))",
                        textAlign: col.align ?? "left",
                      }}
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
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {Math.min(start + 1, total)}–{Math.min(start + pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
