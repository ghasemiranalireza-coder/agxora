"use client";

import { useMemo, type JSX, type MouseEvent } from "react";
import {
  customerStore,
  useCustomerStore,
  useFilteredCustomers,
  type CustomerRecord,
  type CustomerSortKey,
  type CustomerStatus,
} from "../../lib/customers";
import { formatDisplayDate } from "../../lib/i18n";
import {
  Button,
  Card,
  DataTable,
  FilterSelect,
  SearchField,
  Skeleton,
  type DataTableColumn,
} from "../ui";
import { CustomerStatusBadge } from "./CustomerStatusBadge";

export function CustomerTable(): JSX.Element {
  const state = useCustomerStore();
  const { pageRows, total, page } = useFilteredCustomers();

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const row of state.items) {
      for (const tag of row.tags) tags.add(tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [state.items]);

  const columns = useMemo<readonly DataTableColumn<CustomerRecord>[]>(
    () => [
      {
        key: "companyName",
        header: "Company",
        sortable: true,
        render: (row) => (
          <div>
            <p className="font-medium">{row.companyName}</p>
            <p
              className="text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {row.contactPerson}
            </p>
          </div>
        ),
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
        render: (row) => row.email,
      },
      {
        key: "city",
        header: "Location",
        sortable: true,
        render: (row) =>
          [row.city, row.country].filter(Boolean).join(", ") || "—",
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (row) => <CustomerStatusBadge status={row.status} />,
      },
      {
        key: "updatedAt",
        header: "Updated",
        sortable: true,
        render: (row) => formatDisplayDate(row.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div
            className="flex justify-end gap-1"
            onClick={(event: MouseEvent) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => customerStore.openDetails(row.id)}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => customerStore.openEdit(row)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => customerStore.requestDelete(row.id)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <Card className="space-y-4" padding="24px" hover={false}>
      {state.loading && !state.hydrated ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton height={40} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <p className="sr-only">Loading customers…</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(row) => row.id}
          serverPaginated
          totalCount={total}
          page={page}
          pageSize={state.pageSize}
          onPageChange={(next) => customerStore.setPage(next)}
          sortKey={state.sortKey}
          sortDirection={state.sortDirection}
          onSort={(key) => customerStore.setSort(key as CustomerSortKey)}
          onRowClick={(row) => customerStore.openDetails(row.id)}
          emptyTitle={
            state.search || state.statusFilter !== "all" || state.tagFilter
              ? "No matching customers"
              : "No customers yet"
          }
          emptyDescription={
            state.search || state.statusFilter !== "all" || state.tagFilter
              ? "Try adjusting search or filters."
              : "Create your first customer to start managing your accounts."
          }
          minWidth={880}
          toolbar={
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-end">
              <SearchField
                label="Search customers"
                value={state.search}
                onChange={(value) => customerStore.setSearch(value)}
                placeholder="Company, contact, email, city, tags…"
              />
              <FilterSelect
                label="Status"
                value={state.statusFilter}
                onChange={(event) =>
                  customerStore.setStatusFilter(
                    event.target.value as CustomerStatus | "all",
                  )
                }
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </FilterSelect>
              <FilterSelect
                label="Tag"
                value={state.tagFilter}
                onChange={(event) => customerStore.setTagFilter(event.target.value)}
              >
                <option value="">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </FilterSelect>
              <Button
                variant="primary"
                size="sm"
                onClick={() => customerStore.openCreate()}
              >
                Add Customer
              </Button>
            </div>
          }
        />
      )}
    </Card>
  );
}
