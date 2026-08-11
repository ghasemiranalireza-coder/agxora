"use client";

import { memo, useCallback, type JSX, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate, useLocale } from "../../../lib/i18n";
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
  const { t } = useLocale();
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
        aria-label={t("crm.directory.aria.openCustomer", { company: customer.companyName })}
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
          {t("crm.directory.cardMeta", {
            owner: customer.owner,
            date: formatDisplayDate(customer.createdAt),
          })}
        </p>
      </button>
    </Card>
  );
});

export function CrmDirectory(): JSX.Element {
  const router = useRouter();
  const state = useCrmStoreSelector(selectCrmListChrome, shallowEqualRecord);
  const { t } = useLocale();
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
    const translatedError =
      state.error.startsWith("crm.") ? t(state.error) : state.error;
    return (
      <ErrorState
        title={t("crm.directory.errorTitle")}
        description={translatedError}
        onRetry={() => void crmStore.hydrate(state.organizationId)}
      />
    );
  }

  const sortKeys: { key: CrmSortKey; label: string }[] = [
    { key: "companyName", label: t("crm.directory.sort.companyName") },
    { key: "contactName", label: t("crm.directory.sort.contactName") },
    { key: "email", label: t("crm.directory.sort.email") },
    { key: "phone", label: t("crm.directory.sort.phone") },
    { key: "industry", label: t("crm.directory.sort.industry") },
    { key: "status", label: t("crm.directory.sort.status") },
    { key: "owner", label: t("crm.directory.sort.owner") },
    { key: "createdAt", label: t("crm.directory.sort.createdAt") },
  ];

  return (
    <div className="space-y-4">
      <Card hover={false} className="space-y-3" padding="16px">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SearchField
            label={t("crm.directory.search.label")}
            controlSize="sm"
            value={state.search}
            onChange={(value) => crmStore.setSearch(value)}
            placeholder={t("crm.directory.search.placeholder")}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={state.viewMode === "table" ? "primary" : "ghost"}
              aria-pressed={state.viewMode === "table"}
              onClick={() => crmStore.setViewMode("table")}
            >
              {t("crm.directory.view.table")}
            </Button>
            <Button
              size="sm"
              variant={state.viewMode === "cards" ? "primary" : "ghost"}
              aria-pressed={state.viewMode === "cards"}
              onClick={() => crmStore.setViewMode("cards")}
            >
              {t("crm.directory.view.cards")}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => crmStore.openCreate()}
            >
              {t("crm.directory.actions.newCustomer")}
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label={t("crm.directory.filters.status")}
            controlSize="sm"
            value={state.statusFilter}
            onChange={(e) =>
              crmStore.setStatusFilter(
                e.target.value as typeof state.statusFilter,
              )
            }
          >
            <option value="all">{t("crm.directory.filters.allStatuses")}</option>
            {CRM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(statusLabel(status))}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("crm.directory.filters.industry")}
            controlSize="sm"
            value={state.industryFilter}
            onChange={(e) => crmStore.setIndustryFilter(e.target.value)}
          >
            <option value="">{t("crm.directory.filters.allIndustries")}</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("crm.directory.filters.owner")}
            controlSize="sm"
            value={state.ownerFilter}
            onChange={(e) => crmStore.setOwnerFilter(e.target.value)}
          >
            <option value="">{t("crm.directory.filters.allOwners")}</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("crm.directory.filters.country")}
            controlSize="sm"
            value={state.countryFilter}
            onChange={(e) => crmStore.setCountryFilter(e.target.value)}
          >
            <option value="">{t("crm.directory.filters.allCountries")}</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("crm.directory.filters.tags")}
            controlSize="sm"
            value={state.tagFilter}
            onChange={(e) => crmStore.setTagFilter(e.target.value)}
          >
            <option value="">{t("crm.directory.filters.allTags")}</option>
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
          title={
            state.search ||
            state.statusFilter !== "all" ||
            state.industryFilter ||
            state.ownerFilter ||
            state.countryFilter ||
            state.tagFilter
              ? t("crm.directory.empty.noMatches.title")
              : t("crm.directory.empty.ready.title")
          }
          description={
            state.search ||
            state.statusFilter !== "all" ||
            state.industryFilter ||
            state.ownerFilter ||
            state.countryFilter ||
            state.tagFilter
              ? t("crm.directory.empty.noMatches.description")
              : t("crm.directory.empty.ready.description")
          }
          actionLabel={
            state.search ||
            state.statusFilter !== "all" ||
            state.industryFilter ||
            state.ownerFilter ||
            state.countryFilter ||
            state.tagFilter
              ? t("crm.directory.empty.noMatches.action")
              : t("crm.directory.empty.ready.action")
          }
          onAction={() => {
            if (
              state.search ||
              state.statusFilter !== "all" ||
              state.industryFilter ||
              state.ownerFilter ||
              state.countryFilter ||
              state.tagFilter
            ) {
              crmStore.setSearch("");
              crmStore.setStatusFilter("all");
              crmStore.setIndustryFilter("");
              crmStore.setOwnerFilter("");
              crmStore.setCountryFilter("");
              crmStore.setTagFilter("");
              return;
            }
            crmStore.openCreate();
          }}
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
          <table className="agx-ui-table min-w-full text-left text-sm">
            <thead>
              <tr style={{ color: "var(--agx-ds-text-muted, #94a3b8)" }}>
                {sortKeys.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-1 font-medium"
                    aria-sort={
                      state.sortKey === col.key
                        ? state.sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="agx-ui-table-sort"
                      onClick={() => crmStore.setSort(col.key)}
                      aria-label={t("crm.directory.sortBy", { column: col.label })}
                    >
                      {col.label}
                      <span aria-hidden="true" className="text-[10px] opacity-70">
                        {state.sortKey === col.key
                          ? state.sortDirection === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
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
                    color: "var(--agx-ds-text, #f8fafc)",
                  }}
                  tabIndex={0}
                  aria-label={t("crm.directory.aria.openCustomer", { company: customer.companyName })}
                  onClick={() => openCustomer(customer.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCustomer(customer.id);
                    }
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
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("crm.directory.showing", {
              from: (page - 1) * state.pageSize + 1,
              to: Math.min(page * state.pageSize, total),
              total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => crmStore.setPage(page - 1)}
            >
              {t("crm.directory.pagination.previous")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= maxPage}
              onClick={() => crmStore.setPage(page + 1)}
            >
              {t("crm.directory.pagination.next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
