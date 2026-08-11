"use client";

import type { JSX } from "react";
import type { CrmTask } from "../../lib/crm";
import { formatDateTime } from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

function statusTone(
  status: CrmTask["status"],
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "done":
      return "positive";
    case "in_progress":
      return "accent";
    case "open":
      return "warning";
    default:
      return "default";
  }
}

export function TasksModule({
  tasks,
}: {
  readonly tasks: readonly CrmTask[];
}): JSX.Element {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CrmGlassCard padding="p-5">
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("crm.tasks.calendarTitle")}
        </h3>
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {task.title}
                </p>
                <div className="flex gap-2">
                  <CrmBadge tone="accent">{t(`crm.tasks.kinds.${task.kind}`)}</CrmBadge>
                  <CrmBadge tone={statusTone(task.status)}>
                    {t(`crm.tasks.statuses.${task.status}`)}
                  </CrmBadge>
                </div>
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("crm.tasks.duePrefix")} {formatDateTime(task.dueAt)} · {task.relatedTo} ·{" "}
                {task.owner}
              </p>
            </li>
          ))}
        </ul>
      </CrmGlassCard>

      <CrmGlassCard className="space-y-3" padding="p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("crm.tasks.foundationTitle")}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("crm.tasks.foundationDescription")}
        </p>
        <div className="flex flex-wrap gap-2">
          <CrmBadge>{t("crm.tasks.badges.calendarAdapter")}</CrmBadge>
          <CrmBadge>{t("crm.tasks.badges.meetingAdapter")}</CrmBadge>
          <CrmBadge>{t("crm.tasks.badges.reminderQueue")}</CrmBadge>
          <CrmBadge>{t("crm.tasks.badges.followUpEngine")}</CrmBadge>
        </div>
      </CrmGlassCard>
    </div>
  );
}
