export type {
  CrmActivityKind,
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
  CrmTag,
  CrmViewMode,
  SortDirection,
} from "./types";

export {
  CRM_STATUSES,
  CRM_TAG_COLORS,
  statusLabel,
  parseTags,
  emptyCustomerDraft,
  draftFromCustomer,
  emptyContactDraft,
  emptyNoteDraft,
} from "./types";

export {
  validateCustomerDraft,
  customerErrorMap,
  contactErrorMap,
  noteErrorMap,
} from "./validation";

export { crmDirectoryRepository, CRM_STORAGE_KEY } from "./repository";
export {
  crmDirectoryService,
  CrmValidationError,
} from "./service";
export { crmStore } from "./store";
export type { CrmStoreSnapshot } from "./store";
export {
  useCrmStore,
  useCrmStoreSelector,
  useFilteredCrmCustomers,
  useSelectedCrmCustomer,
  useCrmAnalytics,
  useCustomerProjects,
  shallowEqualRecord,
  selectCrmFormSlice,
  selectCrmDeleteSlice,
  selectCrmListChrome,
} from "./hooks";
export { computeCrmAnalytics } from "./analytics";
export type { CrmAnalytics } from "./analytics";
