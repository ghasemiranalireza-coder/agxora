"use client";

import { useCallback, type JSX } from "react";
import { useToast } from "../../lib/backend/hooks";
import { useT } from "../../lib/i18n";
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
  const t = useT();
  const errors = projectErrorMap(state.formErrors);
  const title =
    state.formMode === "edit"
      ? t("projects.form.editTitle")
      : t("projects.form.createTitle");

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
            {t("projects.form.cancel")}
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
                    mode === "edit"
                      ? t("projects.toasts.projectUpdated")
                      : t("projects.toasts.projectCreated"),
                    project.name,
                  );
                } else if (projectStore.getSnapshot().formErrors.length > 0) {
                  toast.warning(
                    t("projects.toasts.checkForm"),
                    projectStore.getSnapshot().formErrors[0]?.message ??
                      t("projects.toasts.validationFailed"),
                  );
                }
              });
            }}
          >
            {state.formMode === "edit"
              ? t("projects.form.saveChanges")
              : t("projects.form.createProject")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("projects.form.projectName")} error={errors.name}>
          <FormInput
            value={state.draft.name}
            onChange={(e) => setField("name", e.target.value)}
            autoFocus
          />
        </FormField>
        <FormField label={t("projects.form.customer")} error={errors.customer}>
          <FormInput
            value={state.draft.customer}
            onChange={(e) => setField("customer", e.target.value)}
          />
        </FormField>
        <FormField label={t("projects.form.projectOwner")} error={errors.owner}>
          <FormInput
            value={state.draft.owner}
            onChange={(e) => setField("owner", e.target.value)}
          />
        </FormField>
        <FormField label={t("projects.form.priority")} error={errors.priority}>
          <FormSelect
            value={state.draft.priority}
            onChange={(e) =>
              setField("priority", e.target.value as ProjectDraft["priority"])
            }
          >
            {PROJECT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`projects.priority.${priority}`)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label={t("projects.form.status")} error={errors.status}>
          <FormSelect
            value={state.draft.status}
            onChange={(e) =>
              setField("status", e.target.value as ProjectDraft["status"])
            }
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`projects.status.${status}`)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label={t("projects.form.budget")} error={errors.budget}>
          <FormInput
            inputMode="decimal"
            value={state.draft.budget}
            onChange={(e) => setField("budget", e.target.value)}
            placeholder={t("projects.form.budgetPlaceholder")}
          />
        </FormField>
        <FormField label={t("projects.form.currency")} error={errors.currency}>
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
        <FormField label={t("projects.form.startDate")} error={errors.startDate}>
          <FormInput
            type="date"
            value={state.draft.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
        </FormField>
        <FormField label={t("projects.form.dueDate")} error={errors.dueDate}>
          <FormInput
            type="date"
            value={state.draft.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
          />
        </FormField>
        <FormField label={t("projects.form.color")} error={errors.color}>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={t("projects.form.selectColor", { color })}
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
        <FormField label={t("projects.form.icon")} error={errors.icon}>
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
        <FormField
          label={t("projects.form.tags")}
          error={errors.tags}
          hint={t("projects.form.tagsHint")}
        >
          <FormInput
            value={state.draft.tags}
            onChange={(e) => setField("tags", e.target.value)}
            placeholder={t("projects.form.tagsPlaceholder")}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t("projects.form.description")} error={errors.description}>
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
