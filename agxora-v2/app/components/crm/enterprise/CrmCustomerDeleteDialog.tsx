"use client";

import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useToast } from "../../../lib/backend/hooks";
import {
  crmStore,
  selectCrmDeleteSlice,
  shallowEqualRecord,
  useCrmStoreSelector,
} from "../../../lib/crm/directory";
import { Button, Dialog } from "../../ui";

export function CrmCustomerDeleteDialog(): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const state = useCrmStoreSelector(selectCrmDeleteSlice, shallowEqualRecord);

  return (
    <Dialog
      open={Boolean(state.deleteId)}
      title="Delete customer"
      dismissible={!state.deleting}
      onClose={() => crmStore.cancelDelete()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => crmStore.cancelDelete()}
            disabled={state.deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={state.deleting}
            disabled={state.deleting}
            onClick={() => {
              const leavingProfile =
                state.selectedId != null &&
                state.selectedId === state.deleteId;
              void crmStore.confirmDelete().then((removed) => {
                if (removed) {
                  toast.success("Customer deleted", removed.companyName);
                  if (leavingProfile) router.replace("/dashboard/crm");
                } else {
                  toast.error(
                    "Delete failed",
                    crmStore.getSnapshot().error ??
                      "Customer could not be removed.",
                  );
                }
              });
            }}
          >
            Delete permanently
          </Button>
        </>
      }
    >
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        This removes{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)" }}>
          {state.companyName ?? "this customer"}
        </strong>{" "}
        and related contacts, notes, documents, and activity from local
        storage. Linked projects are not deleted.
      </p>
    </Dialog>
  );
}
