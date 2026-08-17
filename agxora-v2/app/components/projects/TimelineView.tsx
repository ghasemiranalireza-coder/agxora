"use client";

import { useMemo, type JSX } from "react";
import { formatDisplayDate, useT } from "../../lib/i18n";
import {
  useProjectStore,
  useSelectedProject,
  type ProjectMilestone,
  type TaskRecord,
} from "../../lib/projects";
import { Card, EmptyState } from "../ui";

type TimelineItem = {
  readonly id: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly kind: "project" | "task" | "milestone";
  readonly color: string;
};

function parseDay(iso: string): number | null {
  if (!iso) return null;
  const time = Date.parse(`${iso.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(time) ? null : time;
}

function durationDays(start: string, end: string): number {
  const a = parseDay(start);
  const b = parseDay(end);
  if (a === null || b === null) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

export function TimelineView(): JSX.Element {
  const project = useSelectedProject();
  const state = useProjectStore();
  const t = useT();

  const items = useMemo(() => {
    if (!project) return [] as TimelineItem[];
    const list: TimelineItem[] = [
      {
        id: project.id,
        title: project.name,
        start: project.startDate,
        end: project.dueDate || project.startDate,
        kind: "project",
        color: project.color,
      },
    ];
    for (const milestone of project.milestones as readonly ProjectMilestone[]) {
      list.push({
        id: milestone.id,
        title: milestone.title,
        start: milestone.date,
        end: milestone.date,
        kind: "milestone",
        color: "#fbbf24",
      });
    }
    for (const task of state.tasks as readonly TaskRecord[]) {
      if (!task.dueDate && !project.startDate) continue;
      list.push({
        id: task.id,
        title: task.title,
        start: project.startDate,
        end: task.dueDate || project.dueDate || project.startDate,
        kind: "task",
        color: "rgba(34,211,238,0.85)",
      });
    }
    return list;
  }, [project, state.tasks]);

  const range = useMemo(() => {
    const times = items
      .flatMap((item) => [parseDay(item.start), parseDay(item.end)])
      .filter((value): value is number => value !== null);
    if (times.length === 0) {
      const start = parseDay(project?.startDate ?? "") ?? Date.UTC(2026, 0, 1);
      return { min: start, max: start + 86_400_000 * 30 };
    }
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [items, project?.startDate]);

  const span = Math.max(range.max - range.min, 86_400_000);

  if (!project) {
    return (
      <EmptyState
        title={t("projects.timeline.noTimelineTitle")}
        description={t("projects.timeline.noTimelineDescription")}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("projects.timeline.emptyTitle")}
        description={t("projects.timeline.emptyDescription")}
      />
    );
  }

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <div>
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("projects.timeline.title")}
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("projects.timeline.subtitle")}
        </p>
      </div>
      <div className="space-y-3 overflow-x-auto">
        {items.map((item) => {
          const start = parseDay(item.start) ?? range.min;
          const end = parseDay(item.end) ?? start;
          const left = ((start - range.min) / span) * 100;
          const width = Math.max(((end - start) / span) * 100, 2);
          return (
            <div key={item.id} className="min-w-[520px] space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {item.title}
                  <span
                    className="ml-2 uppercase tracking-wide"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {t(`projects.kind.${item.kind}`)}
                  </span>
                </span>
                <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("projects.timeline.dateRange", {
                    start: formatDisplayDate(item.start),
                    end: formatDisplayDate(item.end),
                    days: durationDays(item.start, item.end),
                  })}
                </span>
              </div>
              <div
                className="relative h-8 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
                aria-label={t("projects.timeline.itemAria", {
                  title: item.title,
                  start: item.start,
                  end: item.end,
                })}
              >
                <div
                  className="absolute top-1 h-6 rounded-lg"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background:
                      item.kind === "milestone"
                        ? item.color
                        : `linear-gradient(90deg, ${item.color}, ${item.color}99)`,
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                  }}
                />
              </div>
              <p
                className="text-[11px]"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {t("projects.timeline.dependenciesNone")}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
