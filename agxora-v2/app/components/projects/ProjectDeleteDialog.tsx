"use client";

import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useToast } from "../../lib/backend/hooks";
import { useT } from "../../lib/i18n";
import {
  projectStore,
  selectProjectDeleteSlice,
  shallowEqualRecord,
  useProjectStoreSelector,
} from "../../lib/projects";
import { Button, Dialog } from "../ui";

export function ProjectDeleteDialog(): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const state = useProjectStoreSelector(
    selectProjectDeleteSlice,
    shallowEqualRecord,
  );

  return (
    <Dialog
      open={Boolean(state.deleteId)}
      title={t("projects.deleteDialog.title")}
      onClose={() => projectStore.cancelDelete()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => projectStore.cancelDelete()}
            disabled={state.deleting}
          >
            {t("projects.deleteDialog.cancel")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={state.deleting}
            onClick={() => {
              const deletingSelected =
                state.selectedId != null &&
                state.selectedId === state.deleteId;
              void projectStore.confirmDelete().then((removed) => {
                if (removed) {
                  toast.success(t("projects.toasts.projectDeleted"), removed.name);
                  if (deletingSelected) {
                    router.replace("/dashboard/projects");
                  }
                }
              });
            }}
          >
            {t("projects.deleteDialog.deletePermanently")}
          </Button>
        </>
      }
    >
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("projects.deleteDialog.bodyPrefix")}{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)" }}>
          {state.projectName ?? t("projects.deleteDialog.thisProject")}
        </strong>{" "}
        {t("projects.deleteDialog.bodySuffix")}
      </p>
    </Dialog>
  );
}
