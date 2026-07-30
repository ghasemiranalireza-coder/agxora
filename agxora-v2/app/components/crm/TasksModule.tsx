"use client";

import type { JSX } from "react";
import type { CrmTask } from "../../lib/crm";
import { formatDateTime } from "../../lib/crm";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

function kindLabel(kind: CrmTask["kind"]): string {
  switch (kind) {
    case "follow_up":
      return "Follow-up";
    case "meeting":
      return "Meeting";
    case "reminder":
      return "Reminder";
    default:
      return "Task";
  }
}

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
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CrmGlassCard padding="p-5">
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Calendar · Meetings · Reminders · Follow-ups
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
                  <CrmBadge tone="accent">{kindLabel(task.kind)}</CrmBadge>
                  <CrmBadge tone={statusTone(task.status)}>
                    {task.status.replaceAll("_", " ")}
                  </CrmBadge>
                </div>
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Due {formatDateTime(task.dueAt)} · {task.relatedTo} · {task.owner}
              </p>
            </li>
          ))}
        </ul>
      </CrmGlassCard>

      <CrmGlassCard className="space-y-3" padding="p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Task OS foundation
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Calendar sync, meeting providers, reminder jobs, and follow-up automation hooks are
          reserved. This board is the shared CRM task surface for every industry module.
        </p>
        <div className="flex flex-wrap gap-2">
          <CrmBadge>Calendar adapter</CrmBadge>
          <CrmBadge>Meeting adapter</CrmBadge>
          <CrmBadge>Reminder queue</CrmBadge>
          <CrmBadge>Follow-up engine</CrmBadge>
        </div>
      </CrmGlassCard>
    </div>
  );
}
