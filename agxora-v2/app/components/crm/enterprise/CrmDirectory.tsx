"use client";

import { memo, useCallback, type JSX, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate } from "../../../lib/i18n";
import {
  CRM_STATUSES,
  crmStore,
  selectCrmListChrome,
  shallowEqualRecord,
  statusLabel,
  useCrmStoreSelector,
  useFilteredCrmCustomers,
  type CrmCustomerRecord,
  type CrmSortKey,
} from "../../../lib/crm/directory";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchField,
  SkeletonCard,
} from "../../ui";
import { CrmStatusBadge, CrmTagChips } from "./CrmBadges";

const MemoCard = memo(function CustomerCard({
  customer,
  onOpen,
}: {
  readonly customer: CrmCustomerRecord;
  readonly onOpen: (id: string) => void;
}): JSX.Element {
  return (
    <Card className="flex h-full flex-col gap-3" padding="18px" hover>
      <button
        type="button"
        className="flex h-full flex-col gap-3 text-left"
        onClick={() => onOpen(customer.id)}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(customer.id);
          }
        }}
        aria-label={`Open customer ${customer.companyName}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {customer.companyName}
            </h3>
            <p
              className="text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {customer.contactName} · {customer.industry}
            </p>
          </div>
          <CrmStatusBadge status={customer.status} />
        </div>
        <p
          className="text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {customer.email}
          {customer.phone ? ` · ${customer.phone}` : ""}
        </p>
        <CrmTagChips tags={customer.tags} />
        <p
          className="mt-auto text-[11px]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Owner {customer.owner} · Created{" "}
          {formatDisplayDate(customer.createdAt)}
        </p>
      </button>
    </Card>
  );
});

export function CrmDirectory(): JSX.Element {
  const router = useRouter();
  const state = useCrmStoreSelector(selectCrmListChrome, shallowEqualRecord);
  const { pageRows, total, page, industries, owners, countries, tags } =
    useFilteredCrmCustomers();
  const maxPage = Math.max(1, Math.ceil(total / state.pageSize) || 1);

  const openCustomer = useCallback(
    (id: string) => {
      void crmStore.openCustomer(id);
      router.push(`/dashboard/crm/${id}`);
    },
    [router],
  );

  if (!state.hydrated || state.loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (state.error && state.itemsLength === 0) {
    return (
      <ErrorState
        title="Couldn’t load CRM"
        description={state.error}
        onRetry={() => void crmStore.hydrate(state.organizationId)}
      />
    );
  }

  const sortKeys: { key: CrmSortKey; label: string }[] = [
    { key: "companyName", label: "Company" },
    { key: "contactName", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "industry", label: "Industry" },
    { key: "status", label: "Status" },
    { key: "owner", label: "Owner" },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <div className="space-y-4">
      <Card hover={false} className="space-y-3" padding="16px">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SearchField
            label="Search customers"
            value={state.search}
            onChange={(value) => crmStore.setSearch(value)}
            placeholder="Company, contact, email, tags…"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={state.viewMode === "table" ? "primary" : "ghost"}
              aria-pressed={state.viewMode === "table"}
              onClick={() => crmStore.setViewMode("table")}
            >
              Table
            </Button>
            <Button
              size="sm"
              variant={state.viewMode === "cards" ? "primary" : "ghost"}
              aria-pressed={state.viewMode === "cards"}
              onClick={() => crmStore.setViewMode("cards")}
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => crmStore.openCreate()}
            >
              New customer
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label="Status"
            value={state.statusFilter}
            onChange={(e) =>
              crmStore.setStatusFilter(
                e.target.value as typeof state.statusFilter,
              )
            }
          >
            <option value="all">All statuses</option>
            {CRM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Industry"
            value={state.industryFilter}
            onChange={(e) => crmStore.setIndustryFilter(e.target.value)}
          >
            <option value="">All industries</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Owner"
            value={state.ownerFilter}
            onChange={(e) => crmStore.setOwnerFilter(e.target.value)}
          >
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Country"
            value={state.countryFilter}
            onChange={(e) => crmStore.setCountryFilter(e.target.value)}
          >
            <option value="">All countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Tags"
            value={state.tagFilter}
            onChange={(e) => crmStore.setTagFilter(e.target.value)}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </FilterSelect>
        </div>
      </Card>

      {total === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Create your first CRM customer to build the directory, profiles, and activity feed."
          actionLabel="Create customer"
          onAction={() => crmStore.openCreate()}
        />
      ) : state.viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((customer) => (
            <MemoCard
              key={customer.id}
              customer={customer}
              onOpen={openCustomer}
            />
          ))}
        </div>
      ) : (
        <Card hover={false} padding="0" className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {sortKeys.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => crmStore.setSort(col.key)}
                      aria-label={`Sort by ${col.label}`}
                    >
                      {col.label}
                      {state.sortKey === col.key
                        ? state.sortDirection === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((customer) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer transition hover:bg-white/5"
                  style={{
                    borderTop:
                      "1px solid var(--agx-card-border, rgba(255,255,255,0.06))",
                    color: "var(--agx-text, #f8fafc)",
                  }}
                  tabIndex={0}
                  aria-label={`Open customer ${customer.companyName}`}
                  onClick={() => openCustomer(customer.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") openCustomer(customer.id);
                  }}
                >
                  <td className="px-4 py-3 font-medium">
                    {customer.companyName}
                  </td>
                  <td className="px-4 py-3">{customer.contactName}</td>
                  <td className="px-4 py-3">{customer.email}</td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3">{customer.industry}</td>
                  <td className="px-4 py-3">
                    <CrmStatusBadge status={customer.status} />
                  </td>
                  <td className="px-4 py-3">{customer.owner}</td>
                  <td className="px-4 py-3">
                    {formatDisplayDate(customer.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Showing {(page - 1) * state.pageSize + 1}–
            {Math.min(page * state.pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => crmStore.setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= maxPage}
              onClick={() => crmStore.setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
