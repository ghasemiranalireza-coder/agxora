/**
 * Pure connection/status resolver.
 *
 * Provider implementation status stays separate from connection status.
 * Never infers "connected" from localStorage, health stubs, or unimplemented providers.
 */

import type { CanonicalProviderId } from "./ids";
import { resolveCapabilityLayers } from "./capabilities";
import { isPlanEntitlementEnforced, planAllowsProvider } from "./capabilities";
import type { CanonicalProviderDefinition } from "./types";
import type { WorkspacePermissionFlags } from "./permission-flags";
import type {
  ConnectionRuntimeStatus,
  PrimaryProviderAction,
  ProviderCapability,
  ProviderUiState,
} from "./types";

export type ResolverConnectionInput = {
  readonly status: ConnectionRuntimeStatus | "not_connected";
  readonly lastError: string | null;
  readonly permissions: WorkspacePermissionFlags | null;
  readonly accountLabel: string | null;
  readonly externalAccountId: string | null;
  readonly connectedAt: string | null;
};

export type ProviderResolverInput = {
  readonly provider: CanonicalProviderDefinition;
  readonly connection: ResolverConnectionInput | null;
  readonly credentialAvailable: boolean;
  readonly currentPlan?: string | null;
  readonly policyAllows?: boolean;
  /**
   * Explicitly ignored. Callers must not pass localStorage as truth.
   * Present so tests can prove it cannot claim connection.
   */
  readonly localStorageConnected?: boolean;
};

export type ResolvedProviderState = {
  readonly providerId: CanonicalProviderId;
  readonly displayName: string;
  readonly category: CanonicalProviderDefinition["category"];
  readonly brandMark: CanonicalProviderDefinition["brandMark"];
  readonly description: string;
  readonly authMethod: CanonicalProviderDefinition["authMethod"];
  readonly implementationStatus: CanonicalProviderDefinition["implementationStatus"];
  readonly requiredPlan: CanonicalProviderDefinition["requiredPlan"];
  readonly supportsConnection: boolean;
  readonly supportsMultipleAccounts: boolean;
  readonly connectionStatus: ConnectionRuntimeStatus;
  readonly uiState: ProviderUiState;
  readonly primaryAction: PrimaryProviderAction;
  readonly connected: boolean;
  readonly accountLabel: string | null;
  readonly externalAccountId: string | null;
  readonly lastError: string | null;
  readonly connectedAt: string | null;
  readonly permissions: WorkspacePermissionFlags | null;
  readonly declaredCapabilities: readonly ProviderCapability[];
  readonly implementedCapabilities: readonly ProviderCapability[];
  readonly grantedCapabilities: readonly ProviderCapability[];
  readonly allowedCapabilities: readonly ProviderCapability[];
};

function primaryActionFor(uiState: ProviderUiState): PrimaryProviderAction {
  switch (uiState) {
    case "available":
    case "requires_authorization":
      return "connect";
    case "connected":
      return "configure";
    case "requires_permission":
      return "configure_permissions";
    case "requires_reauth":
      return "reconnect";
    case "unsupported":
    case "error":
      return "not_available";
    case "coming_soon":
      return "coming_soon";
    case "upgrade_required":
      return "upgrade";
    default:
      return "not_available";
  }
}

function unimplementedUiState(
  implementationStatus: CanonicalProviderDefinition["implementationStatus"],
): ProviderUiState {
  return implementationStatus === "unsupported" ? "unsupported" : "coming_soon";
}

function sideEffectNeedsGrant(
  provider: CanonicalProviderDefinition,
  permissions: WorkspacePermissionFlags | null,
): boolean {
  if (!permissions) return false;
  if (
    provider.implementedCapabilities.includes("send") &&
    permissions.canSendEmail === false
  ) {
    return true;
  }
  if (
    provider.implementedCapabilities.includes("publish") &&
    permissions.canPublish === false
  ) {
    return true;
  }
  return false;
}

export function resolveProviderState(
  input: ProviderResolverInput,
): ResolvedProviderState {
  void input.localStorageConnected;
  const { provider } = input;
  const entitlementOk =
    !isPlanEntitlementEnforced() ||
    planAllowsProvider(provider.requiredPlan, input.currentPlan);

  if (provider.implementationStatus !== "available") {
    const uiState = unimplementedUiState(provider.implementationStatus);
    const layers = resolveCapabilityLayers({
      provider,
      connected: false,
      flags: null,
      policyAllows: false,
    });
    return {
      providerId: provider.providerId,
      displayName: provider.displayName,
      category: provider.category,
      brandMark: provider.brandMark,
      description: provider.description,
      authMethod: provider.authMethod,
      implementationStatus: provider.implementationStatus,
      requiredPlan: provider.requiredPlan,
      supportsConnection: provider.supportsConnection,
      supportsMultipleAccounts: provider.supportsMultipleAccounts,
      connectionStatus: "not_connected",
      uiState,
      primaryAction: primaryActionFor(uiState),
      connected: false,
      accountLabel: null,
      externalAccountId: null,
      lastError: null,
      connectedAt: null,
      permissions: null,
      declaredCapabilities: layers.declared,
      implementedCapabilities: layers.implemented,
      grantedCapabilities: layers.granted,
      allowedCapabilities: layers.allowed,
    };
  }

  if (!entitlementOk) {
    const layers = resolveCapabilityLayers({
      provider,
      connected: false,
      flags: null,
      policyAllows: false,
    });
    return {
      providerId: provider.providerId,
      displayName: provider.displayName,
      category: provider.category,
      brandMark: provider.brandMark,
      description: provider.description,
      authMethod: provider.authMethod,
      implementationStatus: provider.implementationStatus,
      requiredPlan: provider.requiredPlan,
      supportsConnection: provider.supportsConnection,
      supportsMultipleAccounts: provider.supportsMultipleAccounts,
      connectionStatus: "not_connected",
      uiState: "upgrade_required",
      primaryAction: "upgrade",
      connected: false,
      accountLabel: null,
      externalAccountId: null,
      lastError: null,
      connectedAt: null,
      permissions: null,
      declaredCapabilities: layers.declared,
      implementedCapabilities: layers.implemented,
      grantedCapabilities: layers.granted,
      allowedCapabilities: layers.allowed,
    };
  }

  const credentialAvailable = input.credentialAvailable === true;
  const row = input.connection;
  let connectionStatus: ConnectionRuntimeStatus = "not_connected";
  let uiState: ProviderUiState = "available";

  if (credentialAvailable) {
    connectionStatus = "connected";
    uiState = sideEffectNeedsGrant(provider, row?.permissions ?? null)
      ? "requires_permission"
      : "connected";
  } else if (row?.status === "error" || row?.lastError) {
    const reauth =
      row.status === "connected" ||
      /reauth|token|revoked|expired|unauthorized/i.test(row.lastError ?? "");
    connectionStatus = reauth ? "requires_reauth" : "error";
    uiState = reauth ? "requires_reauth" : "error";
  } else if (row?.status === "connected" || row?.status === "requires_reauth") {
    connectionStatus = "requires_reauth";
    uiState = "requires_reauth";
  } else if (row?.status === "pending_auth") {
    connectionStatus = "pending_auth";
    uiState = "requires_authorization";
  } else if (row?.status === "disconnected") {
    connectionStatus = "disconnected";
    uiState = "available";
  } else {
    connectionStatus = "not_connected";
    uiState = "available";
  }

  const connected = credentialAvailable;
  const layers = resolveCapabilityLayers({
    provider,
    connected,
    flags: row?.permissions ?? null,
    policyAllows: input.policyAllows !== false,
  });

  return {
    providerId: provider.providerId,
    displayName: provider.displayName,
    category: provider.category,
    brandMark: provider.brandMark,
    description: provider.description,
    authMethod: provider.authMethod,
    implementationStatus: provider.implementationStatus,
    requiredPlan: provider.requiredPlan,
    supportsConnection: provider.supportsConnection,
    supportsMultipleAccounts: provider.supportsMultipleAccounts,
    connectionStatus,
    uiState,
    primaryAction: primaryActionFor(uiState),
    connected,
    accountLabel: connected ? (row?.accountLabel ?? null) : null,
    externalAccountId: connected ? (row?.externalAccountId ?? null) : null,
    lastError: connected ? null : (row?.lastError ?? null),
    connectedAt: connected ? (row?.connectedAt ?? null) : null,
    permissions: row?.permissions ?? null,
    declaredCapabilities: layers.declared,
    implementedCapabilities: layers.implemented,
    grantedCapabilities: layers.granted,
    allowedCapabilities: layers.allowed,
  };
}

export const CENTER_FILTERS = [
  "all",
  "connected",
  "available",
  "communication",
  "social",
  "productivity",
  "storage",
  "crm",
  "automation",
  "marketplace",
] as const;

export type CenterFilter = (typeof CENTER_FILTERS)[number];

export function filterResolvedProviders(
  providers: readonly ResolvedProviderState[],
  filter: CenterFilter,
): readonly ResolvedProviderState[] {
  switch (filter) {
    case "all":
      return providers;
    case "connected":
      return providers.filter(
        (item) =>
          item.connected ||
          item.uiState === "requires_permission" ||
          item.uiState === "requires_reauth",
      );
    case "available":
      return providers.filter(
        (item) =>
          item.implementationStatus === "available" && !item.connected,
      );
    default:
      return providers.filter((item) => item.category === filter);
  }
}

/** Agent Connected Accounts surface: communication + social from the same registry. */
export function filterAgentSurfaceProviders(
  providers: readonly ResolvedProviderState[],
): readonly ResolvedProviderState[] {
  return providers.filter(
    (item) => item.category === "communication" || item.category === "social",
  );
}
