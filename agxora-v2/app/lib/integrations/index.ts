/**
 * Canonical Integration architecture.
 *
 * Credentials: organization scoped.
 * Connection enablement / permissions: workspace scoped.
 * Actor is the authoritative org/workspace source.
 */

export {
  CANONICAL_PROVIDER_IDS,
  PERSISTENCE_PROVIDER_IDS,
  isCanonicalProviderId,
  isPersistenceProviderId,
  knownProviderAlias,
  routeProviderId,
  socialCredentialPlatformFor,
  toCanonicalProviderId,
  toPersistenceProviderId,
  type CanonicalProviderId,
  type PersistenceProviderId,
} from "./ids";
export {
  PROVIDER_AUTH_METHODS,
  PROVIDER_CAPABILITIES,
  PROVIDER_CATEGORIES,
  PROVIDER_IMPLEMENTATION_STATUSES,
  PROVIDER_PLANS,
  PROVIDER_UI_STATES,
  CONNECTION_RUNTIME_STATUSES,
  type CanonicalProviderDefinition,
  type ConnectionRuntimeStatus,
  type PrimaryProviderAction,
  type ProviderAuthMethod,
  type ProviderCapability,
  type ProviderCategory,
  type ProviderImplementationStatus,
  type ProviderPlan,
  type ProviderUiState,
} from "./types";
export {
  PROVIDER_REGISTRY,
  getProviderDefinition,
  implementationStatusOf,
  isImplementedProvider,
  listAvailableProviders,
  listProviderDefinitions,
} from "./registry";
export {
  flagsFromGrantedCapabilities,
  grantedCapabilitiesFromFlags,
  isPlanEntitlementEnforced,
  planAllowsProvider,
  resolveCapabilityLayers,
  toCanonicalCapability,
  toLegacyCapability,
} from "./capabilities";
export {
  SAFE_PERMISSIONS,
  type WorkspacePermissionFlags,
} from "./permission-flags";
export {
  CENTER_FILTERS,
  filterAgentSurfaceProviders,
  filterResolvedProviders,
  resolveProviderState,
  type CenterFilter,
  type ProviderResolverInput,
  type ResolvedProviderState,
  type ResolverConnectionInput,
} from "./resolver";
export {
  UnimplementedProviderAdapter,
  getProviderAdapter,
  registerProviderAdapter,
  type AdapterContext,
  type ProviderAdapter,
} from "./adapter";
export {
  projectAgentCatalog,
  projectConnectorCatalog,
  toAgentImplementationStatus,
  type AgentCatalogProjection,
} from "./projections";
