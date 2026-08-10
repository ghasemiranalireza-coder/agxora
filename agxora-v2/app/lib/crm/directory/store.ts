"use client";

import {
  CrmContactValidationError,
  CrmNoteValidationError,
  CrmValidationError,
  crmDirectoryService,
} from "./service";
import { crmDirectoryRepository } from "./repository";
import type {
  CrmActivityRecord,
  CrmContactDraft,
  CrmContactRecord,
  CrmCustomerDraft,
  CrmCustomerId,
  CrmCustomerRecord,
  CrmCustomerStatus,
  CrmDocumentRecord,
  CrmNoteDraft,
  CrmNoteRecord,
  CrmProfileTab,
  CrmSortKey,
  CrmViewMode,
  SortDirection,
} from "./types";
import {
  emptyContactDraft,
  emptyCustomerDraft,
  emptyNoteDraft,
} from "./types";
import type {
  CrmContactFieldError,
  CrmFieldError,
  CrmNoteFieldError,
} from "./validation";

type Listener = () => void;

export type CrmStoreSnapshot = {
  readonly items: readonly CrmCustomerRecord[];
  readonly contacts: readonly CrmContactRecord[];
  readonly notes: readonly CrmNoteRecord[];
  readonly documents: readonly CrmDocumentRecord[];
  readonly activities: readonly CrmActivityRecord[];
  readonly organizationId: string | null;
  readonly hydrated: boolean;
  readonly loading: boolean;
  readonly detailLoading: boolean;
  readonly saving: boolean;
  readonly deleting: boolean;
  readonly uploading: boolean;
  readonly error: string | null;
  readonly search: string;
  readonly statusFilter: CrmCustomerStatus | "all";
  readonly industryFilter: string;
  readonly ownerFilter: string;
  readonly countryFilter: string;
  readonly tagFilter: string;
  readonly sortKey: CrmSortKey;
  readonly sortDirection: SortDirection;
  readonly page: number;
  readonly pageSize: number;
  readonly viewMode: CrmViewMode;
  readonly selectedId: CrmCustomerId | null;
  readonly profileTab: CrmProfileTab;
  readonly formOpen: boolean;
  readonly formMode: "create" | "edit";
  readonly editingId: CrmCustomerId | null;
  readonly draft: CrmCustomerDraft;
  readonly formErrors: readonly CrmFieldError[];
  readonly deleteId: CrmCustomerId | null;
  readonly contactDraft: CrmContactDraft;
  readonly contactErrors: readonly CrmContactFieldError[];
  readonly editingContactId: string | null;
  readonly noteDraft: CrmNoteDraft;
  readonly noteErrors: readonly CrmNoteFieldError[];
  readonly editingNoteId: string | null;
};

const listeners = new Set<Listener>();

let snapshot: CrmStoreSnapshot = {
  items: [],
  contacts: [],
  notes: [],
  documents: [],
  activities: [],
  organizationId: null,
  hydrated: false,
  loading: false,
  detailLoading: false,
  saving: false,
  deleting: false,
  uploading: false,
  error: null,
  search: "",
  statusFilter: "all",
  industryFilter: "",
  ownerFilter: "",
  countryFilter: "",
  tagFilter: "",
  sortKey: "createdAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 10,
  viewMode: "table",
  selectedId: null,
  profileTab: "overview",
  formOpen: false,
  formMode: "create",
  editingId: null,
  draft: emptyCustomerDraft(),
  formErrors: [],
  deleteId: null,
  contactDraft: emptyContactDraft(),
  contactErrors: [],
  editingContactId: null,
  noteDraft: emptyNoteDraft(),
  noteErrors: [],
  editingNoteId: null,
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function commit(partial: Partial<CrmStoreSnapshot>): void {
  let changed = false;
  for (const key of Object.keys(partial) as (keyof CrmStoreSnapshot)[]) {
    if (partial[key] !== snapshot[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  snapshot = { ...snapshot, ...partial };
  emit();
}

async function reloadList(organizationId: string | null): Promise<void> {
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
    const items = await crmDirectoryService.list(organizationId);
    commit({ items, loading: false, hydrated: true });
  } catch (error) {
    commit({
      loading: false,
      hydrated: true,
      error:
        error instanceof Error ? error.message : "Failed to load customers.",
    });
  }
}

async function reloadDetail(customerId: CrmCustomerId | null): Promise<void> {
  if (!customerId) {
    commit({
      contacts: [],
      notes: [],
      documents: [],
      activities: [],
      detailLoading: false,
    });
    return;
  }
  commit({ detailLoading: true });
  try {
    const [contacts, notes, documents, activities] = await Promise.all([
      crmDirectoryService.listContacts(customerId),
      crmDirectoryService.listNotes(customerId),
      crmDirectoryService.listDocuments(customerId),
      crmDirectoryService.listActivities(customerId),
    ]);
    commit({
      contacts,
      notes,
      documents,
      activities,
      detailLoading: false,
    });
  } catch (error) {
    commit({
      detailLoading: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load customer profile.",
    });
  }
}

export const crmStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): CrmStoreSnapshot {
    return snapshot;
  },
  async hydrate(organizationId: string | null) {
    await reloadList(organizationId);
    if (snapshot.selectedId) await reloadDetail(snapshot.selectedId);
  },
  async openCustomer(customerId: CrmCustomerId) {
    commit({ selectedId: customerId, profileTab: "overview", error: null });
    await reloadDetail(customerId);
  },
  clearSelection() {
    commit({
      selectedId: null,
      contacts: [],
      notes: [],
      documents: [],
      activities: [],
    });
  },
  setProfileTab(profileTab: CrmProfileTab) {
    commit({ profileTab });
  },
  setSearch(search: string) {
    commit({ search, page: 1 });
  },
  setStatusFilter(statusFilter: CrmCustomerStatus | "all") {
    commit({ statusFilter, page: 1 });
  },
  setIndustryFilter(industryFilter: string) {
    commit({ industryFilter, page: 1 });
  },
  setOwnerFilter(ownerFilter: string) {
    commit({ ownerFilter, page: 1 });
  },
  setCountryFilter(countryFilter: string) {
    commit({ countryFilter, page: 1 });
  },
  setTagFilter(tagFilter: string) {
    commit({ tagFilter, page: 1 });
  },
  setSort(sortKey: CrmSortKey) {
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
  setViewMode(viewMode: CrmViewMode) {
    commit({ viewMode });
  },
  openCreate(defaults?: Partial<CrmCustomerDraft>) {
    commit({
      formOpen: true,
      formMode: "create",
      editingId: null,
      draft: emptyCustomerDraft(defaults),
      formErrors: [],
    });
  },
  openEdit(customer: CrmCustomerRecord) {
    commit({
      formOpen: true,
      formMode: "edit",
      editingId: customer.id,
      draft: {
        companyName: customer.companyName,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        website: customer.website,
        industry: customer.industry,
        country: customer.country,
        city: customer.city,
        address: customer.address,
        taxNumber: customer.taxNumber,
        status: customer.status,
        owner: customer.owner,
        tags: customer.tags.map((tag) => tag.label).join(", "),
      },
      formErrors: [],
    });
  },
  closeForm() {
    commit({ formOpen: false, formErrors: [], editingId: null });
  },
  patchDraft(patch: Partial<CrmCustomerDraft>) {
    commit({ draft: { ...snapshot.draft, ...patch } });
  },
  requestDelete(deleteId: CrmCustomerId) {
    commit({ deleteId, formOpen: false });
  },
  cancelDelete() {
    commit({ deleteId: null });
  },
  async save(): Promise<CrmCustomerRecord | null> {
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
          ? await crmDirectoryService.updateFromDraft(
              snapshot.editingId,
              snapshot.draft,
            )
          : await crmDirectoryService.createFromDraft(
              snapshot.draft,
              organizationId,
            );
      const items = await crmDirectoryService.list(organizationId);
      commit({
        items,
        saving: false,
        formOpen: false,
        editingId: null,
        selectedId: customer.id,
        formErrors: [],
      });
      if (snapshot.selectedId === customer.id) {
        await reloadDetail(customer.id);
      }
      return customer;
    } catch (error) {
      if (error instanceof CrmValidationError) {
        commit({ saving: false, formErrors: error.errors });
        return null;
      }
      commit({
        saving: false,
        formErrors: [
          {
            field: "form",
            message:
              error instanceof Error
                ? error.message
                : "Failed to save customer.",
          },
        ],
      });
      return null;
    }
  },
  async confirmDelete(): Promise<CrmCustomerRecord | null> {
    const id = snapshot.deleteId;
    const organizationId = snapshot.organizationId;
    if (!id || !organizationId) return null;
    const removed = snapshot.items.find((row) => row.id === id) ?? null;
    const clearing = snapshot.selectedId === id;
    commit({ deleting: true, error: null });
    try {
      await crmDirectoryService.deleteCustomer(id);
      commit({
        items: snapshot.items.filter((row) => row.id !== id),
        deleting: false,
        deleteId: null,
        selectedId: clearing ? null : snapshot.selectedId,
        ...(clearing
          ? { contacts: [], notes: [], documents: [], activities: [] }
          : {}),
      });
      return removed;
    } catch (error) {
      await reloadList(organizationId);
      commit({
        deleting: false,
        deleteId: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete customer.",
      });
      return null;
    }
  },
  patchContactDraft(patch: Partial<CrmContactDraft>) {
    commit({ contactDraft: { ...snapshot.contactDraft, ...patch } });
  },
  editContact(contact: CrmContactRecord) {
    commit({
      editingContactId: contact.id,
      contactDraft: {
        name: contact.name,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
        mobile: contact.mobile,
        notes: contact.notes,
      },
      contactErrors: [],
    });
  },
  cancelContactEdit() {
    commit({
      editingContactId: null,
      contactDraft: emptyContactDraft(),
      contactErrors: [],
    });
  },
  async saveContact(): Promise<boolean> {
    const organizationId = snapshot.organizationId;
    const customerId = snapshot.selectedId;
    if (!organizationId || !customerId) return false;
    commit({ saving: true, contactErrors: [] });
    try {
      if (snapshot.editingContactId) {
        await crmDirectoryService.updateContactFromDraft(
          snapshot.editingContactId,
          snapshot.contactDraft,
        );
      } else {
        await crmDirectoryService.createContactFromDraft(
          snapshot.contactDraft,
          customerId,
          organizationId,
        );
      }
      await reloadDetail(customerId);
      commit({
        saving: false,
        editingContactId: null,
        contactDraft: emptyContactDraft(),
        contactErrors: [],
      });
      return true;
    } catch (error) {
      if (error instanceof CrmContactValidationError) {
        commit({ saving: false, contactErrors: error.errors });
        return false;
      }
      commit({
        saving: false,
        contactErrors: [
          {
            field: "form",
            message:
              error instanceof Error
                ? error.message
                : "Failed to save contact.",
          },
        ],
      });
      return false;
    }
  },
  async deleteContact(id: string) {
    const customerId = snapshot.selectedId;
    if (!customerId) return;
    await crmDirectoryService.deleteContact(id);
    await reloadDetail(customerId);
  },
  patchNoteDraft(patch: Partial<CrmNoteDraft>) {
    commit({ noteDraft: { ...snapshot.noteDraft, ...patch } });
  },
  editNote(note: CrmNoteRecord) {
    commit({
      editingNoteId: note.id,
      noteDraft: {
        title: note.title,
        body: note.body,
        author: note.author,
      },
      noteErrors: [],
    });
  },
  cancelNoteEdit() {
    commit({
      editingNoteId: null,
      noteDraft: emptyNoteDraft(),
      noteErrors: [],
    });
  },
  async saveNote(): Promise<boolean> {
    const organizationId = snapshot.organizationId;
    const customerId = snapshot.selectedId;
    if (!organizationId || !customerId) return false;
    commit({ saving: true, noteErrors: [] });
    try {
      if (snapshot.editingNoteId) {
        await crmDirectoryService.updateNoteFromDraft(
          snapshot.editingNoteId,
          snapshot.noteDraft,
        );
      } else {
        await crmDirectoryService.createNoteFromDraft(
          snapshot.noteDraft,
          customerId,
          organizationId,
        );
      }
      await reloadDetail(customerId);
      commit({
        saving: false,
        editingNoteId: null,
        noteDraft: emptyNoteDraft(),
        noteErrors: [],
      });
      return true;
    } catch (error) {
      if (error instanceof CrmNoteValidationError) {
        commit({ saving: false, noteErrors: error.errors });
        return false;
      }
      commit({
        saving: false,
        noteErrors: [
          {
            field: "form",
            message:
              error instanceof Error ? error.message : "Failed to save note.",
          },
        ],
      });
      return false;
    }
  },
  async deleteNote(id: string) {
    const customerId = snapshot.selectedId;
    if (!customerId) return;
    await crmDirectoryService.deleteNote(id);
    await reloadDetail(customerId);
  },
  async uploadDocuments(fileList: FileList | File[], uploadedBy: string) {
    const organizationId = snapshot.organizationId;
    const customerId = snapshot.selectedId;
    if (!organizationId || !customerId) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;
    commit({ uploading: true, error: null });
    try {
      for (const file of files) {
        await crmDirectoryService.attachDocument(
          customerId,
          organizationId,
          file,
          uploadedBy,
        );
      }
      await reloadDetail(customerId);
      commit({ uploading: false });
    } catch (error) {
      commit({
        uploading: false,
        error:
          error instanceof Error ? error.message : "Failed to upload document.",
      });
    }
  },
  async deleteDocument(id: string) {
    const customerId = snapshot.selectedId;
    if (!customerId) return;
    await crmDirectoryService.deleteDocument(id);
    await reloadDetail(customerId);
  },
};

crmDirectoryService.subscribe(() => {
  const organizationId = snapshot.organizationId;
  if (
    !organizationId ||
    snapshot.loading ||
    snapshot.saving ||
    snapshot.deleting ||
    snapshot.uploading ||
    snapshot.detailLoading
  ) {
    return;
  }
  const items = crmDirectoryRepository
    .getDatabase()
    .customers.filter((row) => row.organizationId === organizationId);
  const same =
    items.length === snapshot.items.length &&
    items.every(
      (row, index) =>
        row.id === snapshot.items[index]?.id &&
        row.updatedAt === snapshot.items[index]?.updatedAt,
    );
  if (!same) commit({ items });
});
