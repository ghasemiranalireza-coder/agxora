"use client";

import { useEffect, useState, type JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import type { FinanceLineDraft, FinanceLineView } from "../../../lib/finance/core/types";
import { Button, Dialog, FormField, FormInput, Icon, IconButton } from "../../ui";

const ICON_EDIT =
  "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z";
const ICON_TRASH =
  "M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 5v6m4-6v6";

export function DeliveryNoteItemActions({
  onEdit,
  onDelete,
  disableDelete,
}: {
  readonly onEdit?: () => void;
  readonly onDelete: () => void;
  readonly disableDelete?: boolean;
}): JSX.Element {
  const { t } = useLocale();
  return (
    <div className="agx-finance-item-actions">
      {onEdit ? (
        <IconButton label={t("finance.core.items.edit")} onClick={onEdit}>
          <Icon path={ICON_EDIT} size="sm" />
        </IconButton>
      ) : null}
      <IconButton
        label={t("finance.core.items.delete")}
        className="agx-ui-icon-btn agx-finance-item-delete"
        disabled={disableDelete}
        onClick={onDelete}
      >
        <Icon path={ICON_TRASH} size="sm" />
      </IconButton>
    </div>
  );
}

export function ConfirmDeleteItemDialog({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  readonly open: boolean;
  readonly busy?: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}): JSX.Element {
  const { t } = useLocale();
  return (
    <Dialog
      open={open}
      title={t("finance.core.items.deleteTitle")}
      onClose={() => (busy ? undefined : onClose())}
      dismissible={!busy}
      footer={
        <div className="agx-finance-actions">
          <Button disabled={busy} onClick={onClose}>
            {t("finance.core.actions.cancel")}
          </Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {t("finance.core.items.confirmDelete")}
          </Button>
        </div>
      }
    >
      <p>{t("finance.core.items.deleteBody")}</p>
    </Dialog>
  );
}

export function ItemDraftDialog({
  open,
  title,
  value,
  busy,
  onClose,
  onSave,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly value: FinanceLineDraft;
  readonly busy?: boolean;
  readonly onClose: () => void;
  readonly onSave: (next: FinanceLineDraft) => void;
}): JSX.Element {
  const { t } = useLocale();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  return (
    <Dialog
      open={open}
      title={title}
      onClose={() => (busy ? undefined : onClose())}
      dismissible={!busy}
      footer={
        <div className="agx-finance-actions">
          <Button disabled={busy} onClick={onClose}>
            {t("finance.core.actions.cancel")}
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => onSave(draft)}>
            {t("finance.core.items.saveItem")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <FormField label={t("finance.core.form.description")} required>
          <FormInput
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </FormField>
        <FormField label={t("finance.core.form.quantity")}>
          <FormInput
            value={draft.quantity}
            onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
          />
        </FormField>
        <FormField label={t("finance.core.form.unit")}>
          <FormInput
            value={draft.unit ?? "Stk"}
            onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
          />
        </FormField>
        <FormField label={t("finance.core.form.unitPrice")}>
          <FormInput
            value={draft.unitPriceNet}
            onChange={(event) => setDraft({ ...draft, unitPriceNet: event.target.value })}
          />
        </FormField>
        <FormField label={t("finance.core.form.taxRate")}>
          <FormInput
            value={draft.taxRate ?? "19.00"}
            onChange={(event) => setDraft({ ...draft, taxRate: event.target.value })}
          />
        </FormField>
      </div>
    </Dialog>
  );
}

export function lineViewToDraft(item: FinanceLineView): FinanceLineDraft {
  return {
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPriceNet: item.unitPriceNet,
    taxRate: item.taxRate,
  };
}
