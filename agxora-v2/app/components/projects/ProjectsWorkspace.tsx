"use client";

import { useEffect, type JSX } from "react";
import { formatDisplayDateTime } from "../../lib/i18n";
import { useOrganization } from "../../lib/organization";
import {
  projectRepository,
  projectStore,
  useProjectAnalytics,
  useProjectStore,
} from "../../lib/projects";
import { Card } from "../ui";
import {
  ProjectAnalyticsPanel,
  ProjectKpiCards,
  RecentActivityList,
} from "./ProjectDashboard";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectList } from "./ProjectList";

const LOCAL_ORG_FALLBACK = "org_local_default";

/**
 * Enterprise Project Management OS — portfolio dashboard + list.
 */
export function ProjectsWorkspace(): JSX.Element {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? LOCAL_ORG_FALLBACK;
  const state = useProjectStore();
  const analytics = useProjectAnalytics();

  useEffect(() => {
    void projectStore.hydrate(organizationId);
  }, [organizationId]);

  const recent =
    state.organizationId == null
      ? []
      : (() => {
          void state.items;
          void state.activities;
          return projectRepository
            .getDatabase()
            .activities.filter(
              (row) => row.organizationId === state.organizationId,
            )
            .slice(0, 8);
        })();

  const currency =
    state.items.find((row) => row.budget > 0)?.currency ?? "EUR";

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          Project Management OS
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Projects
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Plan delivery, track budget and health, assign teams, and manage tasks
          for {organization?.name ?? "your organization"}. Data persists locally
          and is ready for backend connectivity.
        </p>
      </Card>

      <ProjectKpiCards analytics={analytics} currency={currency} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ProjectAnalyticsPanel analytics={analytics} />
        <RecentActivityList>
          {recent.length === 0 ? (
            <p
              className="text-sm"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              Activity will appear as projects and tasks are created.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border px-3 py-2"
                  style={{
                    borderColor:
                      "var(--agx-card-border, rgba(255,255,255,0.08))",
                  }}
                >
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--agx-text, #f8fafc)" }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {item.detail} · {formatDisplayDateTime(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </RecentActivityList>
      </div>

      <ProjectList />
      <ProjectFormDialog />
      <ProjectDeleteDialog />
    </div>
  );
}
