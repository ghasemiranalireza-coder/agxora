"use client";

import { useCallback, type FormEvent, type JSX } from "react";
import {
  customerStore,
  errorMap,
  useCustomerStore,
  type CustomerDraft,
} from "../../lib/customers";
import { CUSTOMER_STATUSES } from "../../lib/customers";
import { useToast } from "../../lib/backend/hooks";
import {
  Button,
  Dialog,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
} from "../ui";

export function CustomerFormDialog(): JSX.Element {
  const state = useCustomerStore();
  const toast = useToast();
  const errors = errorMap(state.formErrors);
  const title = state.formMode === "edit" ? "Edit Customer" : "Add Customer";
  const busy = state.saving;

  const setField = useCallback(
    <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => {
      customerStore.patchDraft({ [key]: value } as Partial<CustomerDraft>);
    },
    [],
  );

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy) return;
    const mode = state.formMode;
    void customerStore.save().then((customer) => {
      if (customer) {
        toast.success(
          mode === "edit" ? "Customer updated" : "Customer created",
          customer.companyName,
        );
        return;
      }
      const nextErrors = customerStore.getSnapshot().formErrors;
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
      onClose={() => customerStore.closeForm()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => customerStore.closeForm()}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="customer-form"
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
      <form id="customer-form" className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company Name" error={errors.companyName} required>
            <FormInput
              value={state.draft.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
              autoFocus
              autoComplete="organization"
            />
          </FormField>
          <FormField label="Contact Person" error={errors.contactPerson} required>
            <FormInput
              value={state.draft.contactPerson}
              onChange={(e) => setField("contactPerson", e.target.value)}
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
          <FormField label="Status" error={errors.status} required>
            <FormSelect
              value={state.draft.status}
              onChange={(e) =>
                setField("status", e.target.value as CustomerDraft["status"])
              }
              aria-label="Customer status"
            >
              {CUSTOMER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="Phone" error={errors.phone} required>
            <FormInput
              type="tel"
              value={state.draft.phone}
              onChange={(e) => setField("phone", e.target.value)}
              autoComplete="tel"
            />
          </FormField>
          <FormField label="Mobile" error={errors.mobile}>
            <FormInput
              type="tel"
              value={state.draft.mobile}
              onChange={(e) => setField("mobile", e.target.value)}
              autoComplete="tel"
            />
          </FormField>
          <FormField label="Street" error={errors.street}>
            <FormInput
              value={state.draft.street}
              onChange={(e) => setField("street", e.target.value)}
              autoComplete="street-address"
            />
          </FormField>
          <FormField label="Postal Code" error={errors.postalCode}>
            <FormInput
              value={state.draft.postalCode}
              onChange={(e) => setField("postalCode", e.target.value)}
              autoComplete="postal-code"
            />
          </FormField>
          <FormField label="City" error={errors.city}>
            <FormInput
              value={state.draft.city}
              onChange={(e) => setField("city", e.target.value)}
              autoComplete="address-level2"
            />
          </FormField>
          <FormField label="Country" error={errors.country}>
            <FormInput
              value={state.draft.country}
              onChange={(e) => setField("country", e.target.value)}
              autoComplete="country-name"
            />
          </FormField>
          <FormField label="Tax Number" error={errors.taxNumber}>
            <FormInput
              value={state.draft.taxNumber}
              onChange={(e) => setField("taxNumber", e.target.value)}
            />
          </FormField>
          <FormField label="VAT ID" error={errors.vatId}>
            <FormInput
              value={state.draft.vatId}
              onChange={(e) => setField("vatId", e.target.value)}
            />
          </FormField>
          <FormField label="Tags" hint="Comma-separated" error={errors.tags}>
            <FormInput
              value={state.draft.tags}
              onChange={(e) => setField("tags", e.target.value)}
              placeholder="vip, retail, partner"
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Customer Notes" error={errors.notes}>
              <FormTextArea
                rows={4}
                value={state.draft.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </FormField>
          </div>
        </div>
        {errors.form ? (
          <p className="agx-ui-error" role="alert">
            {errors.form}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
