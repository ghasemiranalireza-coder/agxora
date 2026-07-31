"use client";

import type { JSX } from "react";
import type { BadgeTone } from "../ui";
import { Badge } from "../ui";
import {
  priorityLabel,
  statusLabel,
  type ProjectPriority,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
  taskStatusLabel,
} from "../../lib/projects";

function statusTone(status: ProjectStatus): BadgeTone {
  switch (status) {
    case "active":
      return "accent";
    case "completed":
      return "positive";
    case "on_hold":
      return "warning";
    case "archived":
      return "default";
    case "planning":
      return "default";
    default:
      return "default";
  }
}

function priorityTone(priority: ProjectPriority | TaskPriority): BadgeTone {
  switch (priority) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "accent";
    case "low":
      return "default";
    default:
      return "default";
  }
}

function taskTone(status: TaskStatus): BadgeTone {
  switch (status) {
    case "done":
      return "positive";
    case "review":
      return "warning";
    case "in_progress":
      return "accent";
    default:
      return "default";
  }
}

export function ProjectStatusBadge({
  status,
}: {
  readonly status: ProjectStatus;
}): JSX.Element {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}

export function ProjectPriorityBadge({
  priority,
}: {
  readonly priority: ProjectPriority | TaskPriority;
}): JSX.Element {
  return <Badge tone={priorityTone(priority)}>{priorityLabel(priority)}</Badge>;
}

export function TaskStatusBadge({
  status,
}: {
  readonly status: TaskStatus;
}): JSX.Element {
  return <Badge tone={taskTone(status)}>{taskStatusLabel(status)}</Badge>;
}

export function ProgressBar({
  value,
  color,
  label = "Progress",
}: {
  readonly value: number;
  readonly color?: string;
  readonly label?: string;
}): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1" aria-label={`${label}: ${clamped}%`}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>{label}</span>
        <span style={{ color: "var(--agx-text, #f8fafc)" }}>{clamped}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${clamped}%`,
            background: color || "var(--agx-accent, #22d3ee)",
          }}
        />
      </div>
    </div>
  );
}
