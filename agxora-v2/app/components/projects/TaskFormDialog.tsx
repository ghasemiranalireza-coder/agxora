"use client";

import { useCallback, type JSX } from "react";
import { useToast } from "../../lib/backend/hooks";
import { useT } from "../../lib/i18n";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  projectStore,
  taskErrorMap,
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
  const t = useT();
  const errors = taskErrorMap(state.taskFormErrors);
  const title =
    state.taskFormMode === "edit"
      ? t("projects.taskForm.editTitle")
      : t("projects.taskForm.createTitle");

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
            {t("projects.taskForm.cancel")}
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
                      ? t("projects.toasts.taskUpdated")
                      : t("projects.toasts.taskCreated"),
                    task.title,
                  );
                } else if (
                  projectStore.getSnapshot().taskFormErrors.length > 0
                ) {
                  toast.warning(
                    t("projects.toasts.checkForm"),
                    projectStore.getSnapshot().taskFormErrors[0]?.message ??
                      t("projects.toasts.validationFailed"),
                  );
                }
              });
            }}
          >
            {state.taskFormMode === "edit"
              ? t("projects.taskForm.saveChanges")
              : t("projects.taskForm.createTask")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label={t("projects.taskForm.title")} error={errors.title}>
            <FormInput
              value={state.taskDraft.title}
              onChange={(e) => setField("title", e.target.value)}
              autoFocus
            />
          </FormField>
        </div>
        <FormField label={t("projects.taskForm.assignee")} error={errors.assignee}>
          <FormInput
            value={state.taskDraft.assignee}
            onChange={(e) => setField("assignee", e.target.value)}
          />
        </FormField>
        <FormField label={t("projects.taskForm.priority")} error={errors.priority}>
          <FormSelect
            value={state.taskDraft.priority}
            onChange={(e) =>
              setField("priority", e.target.value as TaskDraft["priority"])
            }
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`projects.priority.${priority}`)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label={t("projects.taskForm.status")} error={errors.status}>
          <FormSelect
            value={state.taskDraft.status}
            onChange={(e) =>
              setField("status", e.target.value as TaskDraft["status"])
            }
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`projects.taskStatus.${status}`)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label={t("projects.taskForm.deadline")} error={errors.dueDate}>
          <FormInput
            type="date"
            value={state.taskDraft.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
          />
        </FormField>
        <FormField label={t("projects.taskForm.progress")} error={errors.progress}>
          <FormInput
            inputMode="numeric"
            value={state.taskDraft.progress}
            onChange={(e) => setField("progress", e.target.value)}
          />
        </FormField>
        <FormField
          label={t("projects.taskForm.labels")}
          error={errors.labels}
          hint={t("projects.taskForm.labelsHint")}
        >
          <FormInput
            value={state.taskDraft.labels}
            onChange={(e) => setField("labels", e.target.value)}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t("projects.taskForm.description")} error={errors.description}>
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
