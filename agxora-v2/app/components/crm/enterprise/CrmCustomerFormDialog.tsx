"use client";

import { useCallback, type FormEvent, type JSX } from "react";
import { useToast } from "../../../lib/backend/hooks";
import {
  CRM_STATUSES,
  crmStore,
  customerErrorMap,
  selectCrmFormSlice,
  shallowEqualRecord,
  statusLabel,
  useCrmStoreSelector,
  type CrmCustomerDraft,
} from "../../../lib/crm/directory";
import {
  Button,
  Dialog,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
} from "../../ui";

export function CrmCustomerFormDialog(): JSX.Element {
  const state = useCrmStoreSelector(selectCrmFormSlice, shallowEqualRecord);
  const toast = useToast();
  const errors = customerErrorMap(state.formErrors);
  const title =
    state.formMode === "edit" ? "Edit Customer" : "Create Customer";
  const busy = state.saving;

  const setField = useCallback(
    <K extends keyof CrmCustomerDraft>(key: K, value: CrmCustomerDraft[K]) => {
      crmStore.patchDraft({ [key]: value } as Partial<CrmCustomerDraft>);
    },
    [],
  );

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy) return;
    const mode = state.formMode;
    void crmStore.save().then((customer) => {
      if (customer) {
        toast.success(
          mode === "edit" ? "Customer updated" : "Customer created",
          customer.companyName,
        );
        return;
      }
      const nextErrors = crmStore.getSnapshot().formErrors;
      if (nextErrors.length > 0) {
        toast.warning(
          "Check the form",
          nextErrors[0]?.message ?? "Validation failed.",
        );
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>('[aria-invalid="true"]')
            ?.focus();
        });
      }
    });
  };

  return (
    <Dialog
      open={state.formOpen}
      title={title}
      wide
      dismissible={!busy}
      onClose={() => crmStore.closeForm()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => crmStore.closeForm()}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="crm-customer-form"
            variant="primary"
            size="sm"
            loading={busy}
            disabled={busy}
          >
            {state.formMode === "edit" ? "Save changes" : "Create customer"}
          </Button>
        </>
      }
    >
      <form id="crm-customer-form" className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company Name" error={errors.companyName} required>
            <FormInput
              value={state.draft.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
              autoFocus
              autoComplete="organization"
            />
          </FormField>
          <FormField label="Contact Name" error={errors.contactName} required>
            <FormInput
              value={state.draft.contactName}
              onChange={(e) => setField("contactName", e.target.value)}
              autoComplete="name"
            />
          </FormField>
          <FormField label="Email" error={errors.email} required>
            <FormInput
              type="email"
              value={state.draft.email}
              onChange={(e) => setField("email", e.target.value)}
              autoComplete="email"
            />
          </FormField>
          <FormField label="Phone" error={errors.phone} required>
            <FormInput
              type="tel"
              value={state.draft.phone}
              onChange={(e) => setField("phone", e.target.value)}
              autoComplete="tel"
            />
          </FormField>
          <FormField label="Website" error={errors.website}>
            <FormInput
              value={state.draft.website}
              onChange={(e) => setField("website", e.target.value)}
              placeholder="https://"
            />
          </FormField>
          <FormField label="Industry" error={errors.industry}>
            <FormInput
              value={state.draft.industry}
              onChange={(e) => setField("industry", e.target.value)}
            />
          </FormField>
          <FormField label="Country" error={errors.country}>
            <FormInput
              value={state.draft.country}
              onChange={(e) => setField("country", e.target.value)}
              autoComplete="country-name"
            />
          </FormField>
          <FormField label="City" error={errors.city}>
            <FormInput
              value={state.draft.city}
              onChange={(e) => setField("city", e.target.value)}
              autoComplete="address-level2"
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Address" error={errors.address}>
              <FormTextArea
                rows={2}
                value={state.draft.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Tax Number" error={errors.taxNumber}>
            <FormInput
              value={state.draft.taxNumber}
              onChange={(e) => setField("taxNumber", e.target.value)}
            />
          </FormField>
          <FormField label="Owner" error={errors.owner}>
            <FormInput
              value={state.draft.owner}
              onChange={(e) => setField("owner", e.target.value)}
            />
          </FormField>
          <FormField label="Status" error={errors.status} required>
            <FormSelect
              value={state.draft.status}
              onChange={(e) =>
                setField("status", e.target.value as CrmCustomerDraft["status"])
              }
              aria-label="Customer status"
            >
              {CRM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField
            label="Tags"
            error={errors.tags}
            hint="Comma-separated, color-coded automatically"
          >
            <FormInput
              value={state.draft.tags}
              onChange={(e) => setField("tags", e.target.value)}
              placeholder="enterprise, retail"
            />
          </FormField>
          {errors.form ? (
            <p className="agx-ui-error sm:col-span-2" role="alert">
              {errors.form}
            </p>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
