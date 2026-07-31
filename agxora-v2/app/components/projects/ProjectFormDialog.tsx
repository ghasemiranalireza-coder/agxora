"use client";

import { useCallback, type JSX } from "react";
import { useToast } from "../../lib/backend/hooks";
import {
  PROJECT_COLORS,
  PROJECT_CURRENCIES,
  PROJECT_ICONS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  projectErrorMap,
  projectStore,
  selectProjectFormSlice,
  shallowEqualRecord,
  statusLabel,
  useProjectStoreSelector,
  type ProjectDraft,
} from "../../lib/projects";
import {
  Button,
  Dialog,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
} from "../ui";

export function ProjectFormDialog(): JSX.Element {
  const state = useProjectStoreSelector(
    selectProjectFormSlice,
    shallowEqualRecord,
  );
  const toast = useToast();
  const errors = projectErrorMap(state.formErrors);
  const title = state.formMode === "edit" ? "Edit Project" : "Create Project";

  const setField = useCallback(
    <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
      projectStore.patchDraft({ [key]: value } as Partial<ProjectDraft>);
    },
    [],
  );

  return (
    <Dialog
      open={state.formOpen}
      title={title}
      wide
      onClose={() => projectStore.closeForm()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => projectStore.closeForm()}
            disabled={state.saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={state.saving}
            onClick={() => {
              const mode = state.formMode;
              void projectStore.save().then((project) => {
                if (project) {
                  toast.success(
                    mode === "edit" ? "Project updated" : "Project created",
                    project.name,
                  );
                } else if (projectStore.getSnapshot().formErrors.length > 0) {
                  toast.warning(
                    "Check the form",
                    projectStore.getSnapshot().formErrors[0]?.message ??
                      "Validation failed.",
                  );
                }
              });
            }}
          >
            {state.formMode === "edit" ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Project Name" error={errors.name}>
          <FormInput
            value={state.draft.name}
            onChange={(e) => setField("name", e.target.value)}
            autoFocus
          />
        </FormField>
        <FormField label="Customer" error={errors.customer}>
          <FormInput
            value={state.draft.customer}
            onChange={(e) => setField("customer", e.target.value)}
          />
        </FormField>
        <FormField label="Project Owner" error={errors.owner}>
          <FormInput
            value={state.draft.owner}
            onChange={(e) => setField("owner", e.target.value)}
          />
        </FormField>
        <FormField label="Priority" error={errors.priority}>
          <FormSelect
            value={state.draft.priority}
            onChange={(e) =>
              setField("priority", e.target.value as ProjectDraft["priority"])
            }
          >
            {PROJECT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Status" error={errors.status}>
          <FormSelect
            value={state.draft.status}
            onChange={(e) =>
              setField("status", e.target.value as ProjectDraft["status"])
            }
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Budget" error={errors.budget}>
          <FormInput
            inputMode="decimal"
            value={state.draft.budget}
            onChange={(e) => setField("budget", e.target.value)}
            placeholder="0"
          />
        </FormField>
        <FormField label="Currency" error={errors.currency}>
          <FormSelect
            value={state.draft.currency}
            onChange={(e) =>
              setField("currency", e.target.value as ProjectDraft["currency"])
            }
          >
            {PROJECT_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Start Date" error={errors.startDate}>
          <FormInput
            type="date"
            value={state.draft.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
        </FormField>
        <FormField label="Due Date" error={errors.dueDate}>
          <FormInput
            type="date"
            value={state.draft.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
          />
        </FormField>
        <FormField label="Color" error={errors.color}>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Select color ${color}`}
                aria-pressed={state.draft.color === color}
                onClick={() => setField("color", color)}
                className="h-8 w-8 rounded-full border-2"
                style={{
                  background: color,
                  borderColor:
                    state.draft.color === color
                      ? "var(--agx-text, #fff)"
                      : "transparent",
                }}
              />
            ))}
          </div>
        </FormField>
        <FormField label="Icon" error={errors.icon}>
          <FormSelect
            value={state.draft.icon}
            onChange={(e) =>
              setField("icon", e.target.value as ProjectDraft["icon"])
            }
          >
            {PROJECT_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Tags" error={errors.tags} hint="Comma-separated">
          <FormInput
            value={state.draft.tags}
            onChange={(e) => setField("tags", e.target.value)}
            placeholder="enterprise, rollout"
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Description" error={errors.description}>
            <FormTextArea
              rows={4}
              value={state.draft.description}
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
