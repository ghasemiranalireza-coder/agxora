"use client";

import type { JSX } from "react";
import { customerStore, useCustomerStore } from "../../lib/customers";
import { useToast } from "../../lib/backend/hooks";
import { Button, Dialog } from "../ui";

export function CustomerDeleteDialog(): JSX.Element {
  const state = useCustomerStore();
  const toast = useToast();
  const target = state.items.find((row) => row.id === state.deleteId) ?? null;
  const busy = state.deleting;

  return (
    <Dialog
      open={Boolean(state.deleteId)}
      title="Delete customer"
      dismissible={!busy}
      onClose={() => customerStore.cancelDelete()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => customerStore.cancelDelete()}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={busy}
            disabled={busy}
            onClick={() => {
              void customerStore
                .confirmDelete()
                .then((removed) => {
                  if (removed) {
                    toast.success("Customer deleted", removed.companyName);
                  } else {
                    toast.error(
                      "Delete failed",
                      "Customer was not found or could not be removed.",
                    );
                  }
                })
                .catch((error: unknown) => {
                  toast.error(
                    "Delete failed",
                    error instanceof Error
                      ? error.message
                      : "Something went wrong while deleting.",
                  );
                });
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-ds-text-muted, #94a3b8)" }}
      >
        {target
          ? `Permanently remove ${target.companyName}? This cannot be undone.`
          : "This customer will be permanently removed."}
      </p>
    </Dialog>
  );
}
