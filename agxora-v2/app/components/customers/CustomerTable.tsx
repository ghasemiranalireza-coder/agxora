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
  type DataTableColumn,
} from "../ui";
import { CustomerStatusBadge } from "./CustomerStatusBadge";

export function CustomerTable(): JSX.Element {
  const state = useCustomerStore();
  const { pageRows, total, page } = useFilteredCustomers();

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
    <Card className="space-y-4" padding="20px" hover={false}>
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
        emptyTitle="No customers yet"
        emptyDescription="Create your first customer to start the CRM workspace."
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
      {state.loading ? (
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Loading customers…
        </p>
      ) : null}
    </Card>
  );
}
