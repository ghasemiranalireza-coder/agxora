"use client";

import { useCallback, type JSX } from "react";
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

  const setField = useCallback(
    <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => {
      customerStore.patchDraft({ [key]: value } as Partial<CustomerDraft>);
    },
    [],
  );

  return (
    <Dialog
      open={state.formOpen}
      title={title}
      wide
      onClose={() => customerStore.closeForm()}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => customerStore.closeForm()}
            disabled={state.saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={state.saving}
            onClick={() => {
              const mode = state.formMode;
              void customerStore.save().then((customer) => {
                if (customer) {
                  toast.success(
                    mode === "edit" ? "Customer updated" : "Customer created",
                    customer.companyName,
                  );
                } else if (customerStore.getSnapshot().formErrors.length > 0) {
                  toast.warning(
                    "Check the form",
                    customerStore.getSnapshot().formErrors[0]?.message ??
                      "Validation failed.",
                  );
                }
              });
            }}
          >
            {state.formMode === "edit" ? "Save changes" : "Create customer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company Name" error={errors.companyName}>
          <FormInput
            value={state.draft.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
            autoFocus
          />
        </FormField>
        <FormField label="Contact Person" error={errors.contactPerson}>
          <FormInput
            value={state.draft.contactPerson}
            onChange={(e) => setField("contactPerson", e.target.value)}
          />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <FormInput
            type="email"
            value={state.draft.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </FormField>
        <FormField label="Status" error={errors.status}>
          <FormSelect
            value={state.draft.status}
            onChange={(e) =>
              setField("status", e.target.value as CustomerDraft["status"])
            }
          >
            {CUSTOMER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Phone" error={errors.phone}>
          <FormInput
            value={state.draft.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </FormField>
        <FormField label="Mobile" error={errors.mobile}>
          <FormInput
            value={state.draft.mobile}
            onChange={(e) => setField("mobile", e.target.value)}
          />
        </FormField>
        <FormField label="Street" error={errors.street}>
          <FormInput
            value={state.draft.street}
            onChange={(e) => setField("street", e.target.value)}
          />
        </FormField>
        <FormField label="Postal Code" error={errors.postalCode}>
          <FormInput
            value={state.draft.postalCode}
            onChange={(e) => setField("postalCode", e.target.value)}
          />
        </FormField>
        <FormField label="City" error={errors.city}>
          <FormInput
            value={state.draft.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </FormField>
        <FormField label="Country" error={errors.country}>
          <FormInput
            value={state.draft.country}
            onChange={(e) => setField("country", e.target.value)}
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
        <FormField
          label="Tags"
          hint="Comma-separated"
          error={errors.tags}
        >
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
        <p className="mt-3 text-sm" style={{ color: "#fb7185" }}>
          {errors.form}
        </p>
      ) : null}
    </Dialog>
  );
}
