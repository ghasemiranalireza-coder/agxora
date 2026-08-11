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
import { translateCrmMessage } from "../../../lib/crm/i18n-helpers";
import { useLocale } from "../../../lib/i18n";
import { Button, Dialog } from "../../ui";

export function CrmCustomerDeleteDialog(): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const state = useCrmStoreSelector(selectCrmDeleteSlice, shallowEqualRecord);
  const { t } = useLocale();

  return (
    <Dialog
      open={Boolean(state.deleteId)}
      title={t("crm.deleteDialog.title")}
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
            {t("crm.deleteDialog.cancel")}
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
                  toast.success(t("crm.toasts.customerDeleted"), removed.companyName);
                  if (leavingProfile) router.replace("/dashboard/crm");
                } else {
                  toast.error(
                    t("crm.toasts.deleteFailed"),
                    translateCrmMessage(t, crmStore.getSnapshot().error ?? undefined) ??
                      t("crm.toasts.customerCouldNotBeRemoved"),
                  );
                }
              });
            }}
          >
            {t("crm.deleteDialog.deletePermanently")}
          </Button>
        </>
      }
    >
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
          {t("crm.deleteDialog.bodyPrefix")}{" "}
          <strong style={{ color: "var(--agx-text, #f8fafc)" }}>
            {state.companyName ?? t("crm.deleteDialog.thisCustomer")}
          </strong>{" "}
          {t("crm.deleteDialog.bodySuffix")}
      </p>
    </Dialog>
  );
}
