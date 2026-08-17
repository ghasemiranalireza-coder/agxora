"use client";

import type { JSX } from "react";
import { customerStore, useCustomerStore } from "../../lib/customers";
import { useToast } from "../../lib/backend/hooks";
import { localizeThrownError, useT } from "../../lib/i18n";
import { Button, Dialog } from "../ui";

export function CustomerDeleteDialog(): JSX.Element {
  const t = useT();
  const state = useCustomerStore();
  const toast = useToast();
  const target = state.items.find((row) => row.id === state.deleteId) ?? null;
  const busy = state.deleting;

  return (
    <Dialog
      open={Boolean(state.deleteId)}
      title={t("customers.delete.title")}
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
            {t("customers.delete.cancel")}
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
                    toast.success(
                      t("customers.delete.success"),
                      removed.companyName,
                    );
                  } else {
                    toast.error(
                      t("customers.delete.failed"),
                      t("customers.delete.notFound"),
                    );
                  }
                })
                .catch((error: unknown) => {
                  toast.error(
                    t("customers.delete.failed"),
                    localizeThrownError(t, error, "customers.delete.errorGeneric"),
                  );
                });
            }}
          >
            {t("customers.delete.confirm")}
          </Button>
        </>
      }
    >
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-ds-text-muted, #94a3b8)" }}
      >
        {target
          ? t("customers.delete.confirmWithName", { company: target.companyName })
          : t("customers.delete.confirmGeneric")}
      </p>
    </Dialog>
  );
}
