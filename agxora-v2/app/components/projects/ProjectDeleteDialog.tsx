"use client";

import type { JSX } from "react";
import { useToast } from "../../lib/backend/hooks";
import { projectStore, useProjectStore } from "../../lib/projects";
import { Button, Dialog } from "../ui";

export function ProjectDeleteDialog(): JSX.Element {
  const state = useProjectStore();
  const toast = useToast();
  const project = state.items.find((row) => row.id === state.deleteId) ?? null;

  return (
    <Dialog
      open={Boolean(state.deleteId)}
      title="Delete project"
      onClose={() => projectStore.cancelDelete()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => projectStore.cancelDelete()}
            disabled={state.deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={state.deleting}
            onClick={() => {
              void projectStore.confirmDelete().then((removed) => {
                if (removed) {
                  toast.success("Project deleted", removed.name);
                }
              });
            }}
          >
            Delete permanently
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        This removes{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)" }}>
          {project?.name ?? "this project"}
        </strong>{" "}
        and all related tasks, files, notes, and activity from local storage.
        This action cannot be undone.
      </p>
    </Dialog>
  );
}
