/**
 * AGXORA Data Platform — public façade (Phase 23).
 *
 * UI and feature modules should import from here (or services/repositories)
 * rather than touching LocalStorage or fetch directly.
 */

export type {
  DataProvider,
  DataProviderId,
  DataProviderCapabilities,
  DataProviderHealth,
} from "@/app/lib/backend/providers/data/types";

export {
  getDataProvider,
  getActiveDataProvider,
  setActiveDataProvider,
  listDataProviders,
  registerDataProvider,
  localDataProvider,
  restDataProvider,
  graphQLDataProvider,
  futureDatabaseProvider,
  mockDataProvider,
} from "@/app/lib/backend/providers/data";

export {
  getApiClient,
  configureApiClient,
  ApiClient,
  ApiClientError,
} from "@/app/lib/backend/api/client";

export {
  domainRepositories,
  crmDataRepository,
  projectsDataRepository,
  financeDataRepository,
  documentsDataRepository,
  aiDataRepository,
  identityDataRepository,
} from "@/app/lib/backend/repositories/domain";

export {
  queryFetch,
  cacheInvalidate,
  cacheInvalidateByTag,
  CacheTags,
} from "@/app/lib/backend/utils/cache";

export {
  mockServer,
  mockOk,
  mockFail,
} from "@/app/lib/backend/mock";

export {
  getPlatformConfig,
  getFeatureFlag,
  setFeatureFlag,
  listFeatureFlags,
} from "@/app/lib/backend/config/featureFlags";

export {
  normalizePlatformError,
  friendlyErrorMessage,
} from "@/app/lib/backend/errors/normalize";

export {
  serverStateStore,
  uiStateStore,
  temporaryStateStore,
} from "@/app/lib/backend/state/slices";

export {
  withGlobalLoading,
  runAsyncState,
  beginOptimistic,
  scheduleBackgroundRefresh,
} from "@/app/lib/backend/loading/strategy";

export {
  logPlatformEvent,
  trackAnalytics,
  markPerformance,
} from "@/app/lib/backend/observability";

export {
  readTokenBundle,
  writeTokenBundle,
  clearTokenBundle,
  setSecureStorageAdapter,
} from "@/app/lib/backend/security/secureStorage";

export type * from "@/app/lib/backend/types/models";

export { useDataPlatformStatus } from "./hooks/useDataPlatformStatus";
