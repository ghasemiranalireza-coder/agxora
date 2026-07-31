"use client";

import { useCallback, useState, type DragEvent, type JSX } from "react";
import {
  projectStore,
  taskStatusLabel,
  useProjectStore,
  type TaskRecord,
  type TaskStatus,
  TASK_STATUSES,
} from "../../lib/projects";
import { Button, Card, EmptyState } from "../ui";
import { ProgressBar, ProjectPriorityBadge } from "./ProjectBadges";

export function KanbanBoard(): JSX.Element {
  const state = useProjectStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onDrop = useCallback(
    (status: TaskStatus, index: number) => {
      if (!draggingId) return;
      void projectStore.moveTask(draggingId, status, index);
      setDraggingId(null);
    },
    [draggingId],
  );

  if (state.tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks on the board"
        description="Create tasks to organize delivery across To Do, In Progress, Review, and Done."
        actionLabel="Add task"
        onAction={() => projectStore.openTaskCreate()}
      />
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-4 lg:grid-cols-2">
      {TASK_STATUSES.map((status) => {
        const ids = state.kanbanOrder[status] ?? [];
        const tasks = ids
          .map((id) => state.tasks.find((task) => task.id === id))
          .filter((task): task is TaskRecord => Boolean(task));
        return (
          <Card
            key={status}
            hover={false}
            padding="14px"
            className="min-h-[280px] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--agx-text, #f8fafc)" }}
              >
                {taskStatusLabel(status)}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--agx-text-muted, #94a3b8)",
                }}
              >
                {tasks.length}
              </span>
            </div>
            <div
              className="min-h-[180px] space-y-2 rounded-xl border border-dashed p-2"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
              }}
              onDragOver={(event: DragEvent) => event.preventDefault()}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                onDrop(status, tasks.length);
              }}
              aria-label={`${taskStatusLabel(status)} column`}
            >
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event: DragEvent) => event.preventDefault()}
                  onDrop={(event: DragEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDrop(status, index);
                  }}
                  className="cursor-grab space-y-2 rounded-xl border p-3 active:cursor-grabbing"
                  style={{
                    borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
                    background:
                      draggingId === task.id
                        ? "rgba(34,211,238,0.12)"
                        : "rgba(255,255,255,0.03)",
                  }}
                  role="listitem"
                  aria-grabbed={draggingId === task.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--agx-text, #f8fafc)" }}
                    >
                      {task.title}
                    </p>
                    <ProjectPriorityBadge priority={task.priority} />
                  </div>
                  {task.assignee ? (
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                    >
                      {task.assignee}
                    </p>
                  ) : null}
                  <ProgressBar value={task.progress} label="Task progress" />
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => projectStore.openTaskEdit(task)}
                    >
                      Edit
                    </Button>
                    {task.status !== "done" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void projectStore.completeTask(task.id)}
                      >
                        Complete
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
