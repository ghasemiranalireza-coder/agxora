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
import { formatDisplayDate, useT } from "../../lib/i18n";
import {
  Button,
  Card,
  DataTable,
  ErrorState,
  FilterSelect,
  SearchField,
  Skeleton,
  type DataTableColumn,
} from "../ui";
import { CustomerStatusBadge } from "./CustomerStatusBadge";

export function CustomerTable(): JSX.Element {
  const t = useT();
  const state = useCustomerStore();
  const { pageRows, total, page } = useFilteredCustomers();
  const hasFilters =
    Boolean(state.search) ||
    state.statusFilter !== "all" ||
    Boolean(state.tagFilter);

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
        header: t("customers.table.columns.company"),
        sortable: true,
        render: (row) => (
          <div>
            <p className="font-medium" style={{ color: "var(--agx-ds-text)" }}>
              {row.companyName}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--agx-ds-text-muted, #94a3b8)" }}
            >
              {row.contactPerson}
            </p>
          </div>
        ),
      },
      {
        key: "email",
        header: t("customers.table.columns.email"),
        sortable: true,
        render: (row) => (
          <span style={{ color: "var(--agx-ds-text)" }}>{row.email}</span>
        ),
      },
      {
        key: "city",
        header: t("customers.table.columns.location"),
        sortable: true,
        render: (row) =>
          [row.city, row.country].filter(Boolean).join(", ") || "—",
      },
      {
        key: "status",
        header: t("customers.table.columns.status"),
        sortable: true,
        render: (row) => <CustomerStatusBadge status={row.status} />,
      },
      {
        key: "updatedAt",
        header: t("customers.table.columns.updated"),
        sortable: true,
        render: (row) => formatDisplayDate(row.updatedAt),
      },
      {
        key: "actions",
        header: t("customers.table.columns.actions"),
        align: "right",
        render: (row) => (
          <div
            className="agx-ui-table-actions"
            onClick={(event: MouseEvent) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              aria-label={t("customers.table.viewAria", {
                company: row.companyName,
              })}
              onClick={() => customerStore.openDetails(row.id)}
            >
              {t("customers.table.view")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              aria-label={t("customers.table.editAria", {
                company: row.companyName,
              })}
              onClick={() => customerStore.openEdit(row)}
            >
              {t("customers.table.edit")}
            </Button>
            <Button
              size="sm"
              variant="danger"
              aria-label={t("customers.table.deleteAria", {
                company: row.companyName,
              })}
              onClick={() => customerStore.requestDelete(row.id)}
            >
              {t("customers.table.delete")}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  if (state.error && state.items.length === 0) {
    return (
      <Card className="space-y-4" padding="24px" hover={false}>
        <ErrorState
          title={t("customers.table.errorLoad")}
          description={state.error}
          onRetry={() =>
            void customerStore.hydrate(state.organizationId ?? "org_local_default")
          }
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-4" padding="24px" hover={false}>
      {state.error ? (
        <ErrorState
          title={t("customers.table.errorGeneric")}
          description={state.error}
          onRetry={() =>
            void customerStore.hydrate(state.organizationId ?? "org_local_default")
          }
        />
      ) : null}
      {state.loading && !state.hydrated ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton height={40} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <p className="sr-only">{t("customers.table.loading")}</p>
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
            hasFilters
              ? t("customers.table.emptyFilteredTitle")
              : t("customers.table.emptyTitle")
          }
          emptyDescription={
            hasFilters
              ? t("customers.table.emptyFilteredDescription")
              : t("customers.table.emptyDescription")
          }
          minWidth={880}
          toolbar={
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-end">
              <SearchField
                label={t("customers.table.searchLabel")}
                controlSize="sm"
                value={state.search}
                onChange={(value) => customerStore.setSearch(value)}
                placeholder={t("customers.table.searchPlaceholder")}
              />
              <FilterSelect
                label={t("customers.table.statusFilter")}
                controlSize="sm"
                value={state.statusFilter}
                onChange={(event) =>
                  customerStore.setStatusFilter(
                    event.target.value as CustomerStatus | "all",
                  )
                }
              >
                <option value="all">{t("customers.table.allStatuses")}</option>
                <option value="active">{t("customers.status.active")}</option>
                <option value="prospect">{t("customers.status.prospect")}</option>
                <option value="inactive">{t("customers.status.inactive")}</option>
                <option value="blocked">{t("customers.status.blocked")}</option>
              </FilterSelect>
              <FilterSelect
                label={t("customers.table.tagFilter")}
                controlSize="sm"
                value={state.tagFilter}
                onChange={(event) =>
                  customerStore.setTagFilter(event.target.value)
                }
              >
                <option value="">{t("customers.table.allTags")}</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </FilterSelect>
              {hasFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    customerStore.setSearch("");
                    customerStore.setStatusFilter("all");
                    customerStore.setTagFilter("");
                  }}
                >
                  {t("customers.table.clearFilters")}
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                onClick={() => customerStore.openCreate()}
              >
                {t("customers.table.addCustomer")}
              </Button>
            </div>
          }
        />
      )}
    </Card>
  );
}
