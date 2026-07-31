"use client";

import { memo, useCallback, type JSX, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate } from "../../lib/i18n";
import {
  formatMoney,
  projectStore,
  selectProjectListChrome,
  selectProjectSortSlice,
  shallowEqualRecord,
  statusLabel,
  useFilteredProjects,
  useProjectStoreSelector,
  type ProjectRecord,
  type ProjectSortKey,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
} from "../../lib/projects";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchField,
  Skeleton,
  SkeletonCard,
} from "../ui";
import {
  ProgressBar,
  ProjectPriorityBadge,
  ProjectStatusBadge,
} from "./ProjectBadges";

function ProjectCardView({
  project,
  onOpen,
}: {
  readonly project: ProjectRecord;
  readonly onOpen: (id: string) => void;
}): JSX.Element {
  return (
    <Card
      className="flex h-full cursor-pointer flex-col gap-3"
      padding="18px"
      hover
    >
      <button
        type="button"
        className="flex h-full flex-col gap-3 text-left"
        onClick={() => onOpen(project.id)}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(project.id);
          }
        }}
        aria-label={`Open project ${project.name}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold"
              style={{
                background: `${project.color}22`,
                color: project.color,
                border: `1px solid ${project.color}55`,
              }}
              aria-hidden="true"
            >
              {project.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--agx-text, #f8fafc)" }}
              >
                {project.name}
              </h3>
              <p
                className="text-xs"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {project.customer} · {project.owner}
              </p>
            </div>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p
          className="line-clamp-2 text-xs leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {project.description || "No description yet."}
        </p>
        <ProgressBar value={project.progress} color={project.color} />
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <ProjectPriorityBadge priority={project.priority} />
          <span
            className="text-[11px]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {formatMoney(project.budget, project.currency)}
          </span>
          {project.dueDate ? (
            <span
              className="text-[11px]"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              Due {formatDisplayDate(project.dueDate)}
            </span>
          ) : null}
        </div>
      </button>
    </Card>
  );
}

const MemoProjectCard = memo(ProjectCardView);

export function ProjectList(): JSX.Element {
  const router = useRouter();
  const state = useProjectStoreSelector(
    selectProjectListChrome,
    shallowEqualRecord,
  );
  const { pageRows, total, page, customers, owners } = useFilteredProjects();
  const maxPage = Math.max(1, Math.ceil(total / state.pageSize) || 1);

  const openProject = useCallback(
    (id: string) => {
      void projectStore.openProject(id);
      router.push(`/dashboard/projects/${id}`);
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
        title="Couldn’t load projects"
        description={state.error}
        onRetry={() => void projectStore.hydrate(state.organizationId)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card hover={false} className="space-y-3" padding="16px">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            label="Search projects"
            value={state.search}
            onChange={(value) => projectStore.setSearch(value)}
            placeholder="Search projects, customers, owners, tags…"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant={state.viewMode === "cards" ? "primary" : "ghost"}
              size="sm"
              onClick={() => projectStore.setViewMode("cards")}
              aria-pressed={state.viewMode === "cards"}
            >
              Cards
            </Button>
            <Button
              variant={state.viewMode === "table" ? "primary" : "ghost"}
              size="sm"
              onClick={() => projectStore.setViewMode("table")}
              aria-pressed={state.viewMode === "table"}
            >
              Table
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => projectStore.openCreate()}
            >
              New project
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label="Status"
            value={state.statusFilter}
            onChange={(e) =>
              projectStore.setStatusFilter(
                e.target.value as typeof state.statusFilter,
              )
            }
          >
            <option value="all">All statuses</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Priority"
            value={state.priorityFilter}
            onChange={(e) =>
              projectStore.setPriorityFilter(
                e.target.value as typeof state.priorityFilter,
              )
            }
          >
            <option value="all">All priorities</option>
            {PROJECT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Customer"
            value={state.customerFilter}
            onChange={(e) => projectStore.setCustomerFilter(e.target.value)}
          >
            <option value="">All customers</option>
            {customers.map((customer) => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Owner"
            value={state.ownerFilter}
            onChange={(e) => projectStore.setOwnerFilter(e.target.value)}
          >
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </FilterSelect>
          <div className="grid grid-cols-2 gap-2">
            <label
              className="block space-y-1.5 text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              From
              <input
                type="date"
                value={state.dateFrom}
                onChange={(e) => projectStore.setDateFrom(e.target.value)}
                className="w-full rounded-xl border px-2 py-2 text-xs"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              />
            </label>
            <label
              className="block space-y-1.5 text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              To
              <input
                type="date"
                value={state.dateTo}
                onChange={(e) => projectStore.setDateTo(e.target.value)}
                className="w-full rounded-xl border px-2 py-2 text-xs"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              />
            </label>
          </div>
        </div>
      </Card>

      {total === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first enterprise project to track delivery, budget, team, and tasks."
          actionLabel="Create project"
          onAction={() => projectStore.openCreate()}
        />
      ) : state.viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((project) => (
            <MemoProjectCard
              key={project.id}
              project={project}
              onOpen={openProject}
            />
          ))}
        </div>
      ) : (
        <ProjectTableView rows={pageRows} onOpen={openProject} />
      )}

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Showing {(page - 1) * state.pageSize + 1}–
            {Math.min(page * state.pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => projectStore.setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= maxPage}
              onClick={() => projectStore.setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectTableView({
  rows,
  onOpen,
}: {
  readonly rows: readonly ProjectRecord[];
  readonly onOpen: (id: string) => void;
}): JSX.Element {
  const state = useProjectStoreSelector(
    selectProjectSortSlice,
    shallowEqualRecord,
  );
  const sortKeys: { key: ProjectSortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "customer", label: "Customer" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "progress", label: "Progress" },
    { key: "dueDate", label: "Due" },
    { key: "budget", label: "Budget" },
  ];

  return (
    <Card hover={false} padding="0" className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr
            style={{
              color: "var(--agx-text-muted, #94a3b8)",
              borderBottom:
                "1px solid var(--agx-card-border, rgba(255,255,255,0.08))",
            }}
          >
            {sortKeys.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => projectStore.setSort(col.key)}
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
          {rows.map((project) => (
            <tr
              key={project.id}
              className="cursor-pointer transition hover:bg-white/5"
              style={{
                borderBottom:
                  "1px solid var(--agx-card-border, rgba(255,255,255,0.06))",
                color: "var(--agx-text, #f8fafc)",
              }}
              onClick={() => onOpen(project.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onOpen(project.id);
              }}
              tabIndex={0}
              aria-label={`Open project ${project.name}`}
            >
              <td className="px-4 py-3 font-medium">{project.name}</td>
              <td className="px-4 py-3">{project.customer}</td>
              <td className="px-4 py-3">{project.owner}</td>
              <td className="px-4 py-3">
                <ProjectStatusBadge status={project.status} />
              </td>
              <td className="px-4 py-3">
                <ProjectPriorityBadge priority={project.priority} />
              </td>
              <td className="px-4 py-3 min-w-[120px]">
                <ProgressBar value={project.progress} color={project.color} />
              </td>
              <td className="px-4 py-3">
                {project.dueDate ? formatDisplayDate(project.dueDate) : "—"}
              </td>
              <td className="px-4 py-3">
                {formatMoney(project.budget, project.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="p-6">
          <Skeleton height={18} width="40%" />
        </div>
      ) : null}
    </Card>
  );
}
