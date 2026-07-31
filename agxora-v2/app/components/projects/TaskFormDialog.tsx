"use client";

import { useCallback, type JSX } from "react";
import { useToast } from "../../lib/backend/hooks";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  projectStore,
  taskErrorMap,
  taskStatusLabel,
  useProjectStore,
  type TaskDraft,
} from "../../lib/projects";
import {
  Button,
  Dialog,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
} from "../ui";

export function TaskFormDialog(): JSX.Element {
  const state = useProjectStore();
  const toast = useToast();
  const errors = taskErrorMap(state.taskFormErrors);
  const title = state.taskFormMode === "edit" ? "Edit Task" : "Create Task";

  const setField = useCallback(
    <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => {
      projectStore.patchTaskDraft({ [key]: value } as Partial<TaskDraft>);
    },
    [],
  );

  return (
    <Dialog
      open={state.taskFormOpen}
      title={title}
      onClose={() => projectStore.closeTaskForm()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => projectStore.closeTaskForm()}
            disabled={state.saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={state.saving}
            onClick={() => {
              void projectStore.saveTask().then((task) => {
                if (task) {
                  toast.success(
                    state.taskFormMode === "edit"
                      ? "Task updated"
                      : "Task created",
                    task.title,
                  );
                } else if (
                  projectStore.getSnapshot().taskFormErrors.length > 0
                ) {
                  toast.warning(
                    "Check the form",
                    projectStore.getSnapshot().taskFormErrors[0]?.message ??
                      "Validation failed.",
                  );
                }
              });
            }}
          >
            {state.taskFormMode === "edit" ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Title" error={errors.title}>
            <FormInput
              value={state.taskDraft.title}
              onChange={(e) => setField("title", e.target.value)}
              autoFocus
            />
          </FormField>
        </div>
        <FormField label="Assignee" error={errors.assignee}>
          <FormInput
            value={state.taskDraft.assignee}
            onChange={(e) => setField("assignee", e.target.value)}
          />
        </FormField>
        <FormField label="Priority" error={errors.priority}>
          <FormSelect
            value={state.taskDraft.priority}
            onChange={(e) =>
              setField("priority", e.target.value as TaskDraft["priority"])
            }
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Status" error={errors.status}>
          <FormSelect
            value={state.taskDraft.status}
            onChange={(e) =>
              setField("status", e.target.value as TaskDraft["status"])
            }
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {taskStatusLabel(status)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Deadline" error={errors.dueDate}>
          <FormInput
            type="date"
            value={state.taskDraft.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
          />
        </FormField>
        <FormField label="Progress" error={errors.progress}>
          <FormInput
            inputMode="numeric"
            value={state.taskDraft.progress}
            onChange={(e) => setField("progress", e.target.value)}
          />
        </FormField>
        <FormField label="Labels" error={errors.labels} hint="Comma-separated">
          <FormInput
            value={state.taskDraft.labels}
            onChange={(e) => setField("labels", e.target.value)}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Description" error={errors.description}>
            <FormTextArea
              rows={3}
              value={state.taskDraft.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </FormField>
        </div>
        {errors.form ? (
          <p className="sm:col-span-2 text-sm" style={{ color: "#fb7185" }}>
            {errors.form}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
