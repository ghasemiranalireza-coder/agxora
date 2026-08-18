"use client";

/**
 * Customer store — loading / saving / editing / deleting / search / selection.
 * Snapshot is cached for useSyncExternalStore stability.
 */

import { customerCrmService, CustomerValidationError } from "./service";
import type {
  CustomerDraft,
  CustomerId,
  CustomerRecord,
  CustomerSortKey,
  CustomerStatus,
  SortDirection,
} from "./types";
import { emptyCustomerDraft } from "./types";
import type { CustomerFieldError } from "./validation";
import { isTranslationKey } from "@/app/lib/i18n";

type Listener = () => void;

export type CustomerStoreSnapshot = {
  readonly items: readonly CustomerRecord[];
  readonly organizationId: string | null;
  readonly hydrated: boolean;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly deleting: boolean;
  readonly error: string | null;
  readonly search: string;
  readonly statusFilter: CustomerStatus | "all";
  readonly tagFilter: string;
  readonly sortKey: CustomerSortKey;
  readonly sortDirection: SortDirection;
  readonly page: number;
  readonly pageSize: number;
  readonly selectedId: CustomerId | null;
  readonly editingId: CustomerId | null;
  readonly formOpen: boolean;
  readonly formMode: "create" | "edit";
  readonly draft: CustomerDraft;
  readonly formErrors: readonly CustomerFieldError[];
  readonly detailsOpen: boolean;
  readonly deleteId: CustomerId | null;
};

const listeners = new Set<Listener>();

let snapshot: CustomerStoreSnapshot = {
  items: [],
  organizationId: null,
  hydrated: false,
  loading: false,
  saving: false,
  deleting: false,
  error: null,
  search: "",
  statusFilter: "all",
  tagFilter: "",
  sortKey: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 10,
  selectedId: null,
  editingId: null,
  formOpen: false,
  formMode: "create",
  draft: emptyCustomerDraft(),
  formErrors: [],
  detailsOpen: false,
  deleteId: null,
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function commit(partial: Partial<CustomerStoreSnapshot>): void {
  let changed = false;
  for (const key of Object.keys(partial) as (keyof CustomerStoreSnapshot)[]) {
    if (partial[key] !== snapshot[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  snapshot = { ...snapshot, ...partial };
  emit();
}

async function reload(organizationId: string | null): Promise<void> {
  if (!organizationId) {
    commit({
      items: [],
      organizationId: null,
      hydrated: true,
      loading: false,
      error: null,
    });
    return;
  }
  commit({ loading: true, organizationId, error: null });
  try {
    const items = await customerCrmService.list(organizationId);
    commit({ items, loading: false, hydrated: true, error: null });
  } catch {
    commit({
      loading: false,
      hydrated: true,
      error: "customers.table.errorLoad",
    });
  }
}

export const customerStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): CustomerStoreSnapshot {
    return snapshot;
  },
  async hydrate(organizationId: string | null) {
    await reload(organizationId);
  },
  setSearch(search: string) {
    commit({ search, page: 1 });
  },
  setStatusFilter(statusFilter: CustomerStatus | "all") {
    commit({ statusFilter, page: 1 });
  },
  setTagFilter(tagFilter: string) {
    commit({ tagFilter, page: 1 });
  },
  setSort(sortKey: CustomerSortKey) {
    if (snapshot.sortKey === sortKey) {
      commit({
        sortDirection: snapshot.sortDirection === "asc" ? "desc" : "asc",
      });
      return;
    }
    commit({ sortKey, sortDirection: "asc" });
  },
  setPage(page: number) {
    commit({ page: Math.max(1, page) });
  },
  select(selectedId: CustomerId | null) {
    commit({ selectedId });
  },
  openCreate(defaults?: Partial<CustomerDraft>) {
    commit({
      formOpen: true,
      formMode: "create",
      editingId: null,
      draft: emptyCustomerDraft(defaults),
      formErrors: [],
    });
  },
  openEdit(customer: CustomerRecord) {
    commit({
      formOpen: true,
      formMode: "edit",
      editingId: customer.id,
      selectedId: customer.id,
      detailsOpen: false,
      draft: {
        companyName: customer.companyName,
        contactPerson: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        street: customer.street,
        postalCode: customer.postalCode,
        city: customer.city,
        country: customer.country,
        taxNumber: customer.taxNumber,
        vatId: customer.vatId,
        notes: customer.notes,
        status: customer.status,
        tags: customer.tags.join(", "),
      },
      formErrors: [],
    });
  },
  closeForm() {
    commit({ formOpen: false, formErrors: [], editingId: null });
  },
  patchDraft(patch: Partial<CustomerDraft>) {
    commit({ draft: { ...snapshot.draft, ...patch } });
  },
  openDetails(customerId: CustomerId) {
    commit({ selectedId: customerId, detailsOpen: true });
  },
  closeDetails() {
    commit({ detailsOpen: false });
  },
  requestDelete(deleteId: CustomerId) {
    commit({
      deleteId,
      detailsOpen: false,
      formOpen: false,
    });
  },
  cancelDelete() {
    commit({ deleteId: null });
  },
  async save(): Promise<CustomerRecord | null> {
    const organizationId = snapshot.organizationId;
    if (!organizationId) {
      commit({
        formErrors: [{ field: "form", message: "Organization is required." }],
      });
      return null;
    }
    commit({ saving: true, formErrors: [] });
    try {
      const customer =
        snapshot.formMode === "edit" && snapshot.editingId
          ? await customerCrmService.updateFromDraft(
              snapshot.editingId,
              snapshot.draft,
              organizationId,
            )
          : await customerCrmService.createFromDraft(
              snapshot.draft,
              organizationId,
            );
      const items = await customerCrmService.list(organizationId);
      commit({
        items,
        saving: false,
        formOpen: false,
        editingId: null,
        selectedId: customer.id,
        formErrors: [],
      });
      return customer;
    } catch (error) {
      if (error instanceof CustomerValidationError) {
        commit({ saving: false, formErrors: error.errors });
        return null;
      }
      commit({
        saving: false,
        formErrors: [
          {
            field: "form",
            message:
              error instanceof Error && isTranslationKey(error.message)
                ? error.message
                : "crm.toast.failedToSaveCustomer",
          },
        ],
      });
      return null;
    }
  },
  async confirmDelete(): Promise<CustomerRecord | null> {
    const id = snapshot.deleteId;
    const organizationId = snapshot.organizationId;
    if (!id || !organizationId) return null;
    commit({ deleting: true });
    try {
      const removed = await customerCrmService.deleteCustomer(id);
      const items = await customerCrmService.list(organizationId);
      commit({
        items,
        deleting: false,
        deleteId: null,
        selectedId: snapshot.selectedId === id ? null : snapshot.selectedId,
        detailsOpen: snapshot.selectedId === id ? false : snapshot.detailsOpen,
      });
      return removed;
    } catch (error) {
      commit({ deleting: false });
      throw error;
    }
  },
};

customerCrmService.subscribe(() => {
  const organizationId = snapshot.organizationId;
  if (!organizationId || snapshot.loading || snapshot.saving || snapshot.deleting) {
    return;
  }
  void customerCrmService.list(organizationId).then((items) => {
    const same =
      items.length === snapshot.items.length &&
      items.every(
        (row, index) =>
          row.id === snapshot.items[index]?.id &&
          row.updatedAt === snapshot.items[index]?.updatedAt,
      );
    if (!same) commit({ items });
  });
});
