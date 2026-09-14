/**
 * Capability layers.
 *
 * Resolution (architecture only — execution still uses existing Gmail/YouTube paths):
 *   provider declares capability
 *           ↓
 *   provider implementation supports capability
 *           ↓
 *   connection exists
 *           ↓
 *   OAuth/provider permission exists
 *           ↓
 *   workspace permission enabled
 *           ↓
 *   plan entitlement (future — not enforced this phase)
 *           ↓
 *   agent policy
 *           ↓
 *   approval
 *           ↓
 *   execution
 *
 * A declared capability is never treated as executable on its own.
 */

import type { CanonicalProviderDefinition, ProviderCapability } from "./types";
import {
  SAFE_PERMISSIONS,
  type WorkspacePermissionFlags,
} from "./permission-flags";

const LEGACY_TO_CANONICAL: Readonly<
  Record<string, ProviderCapability>
> = {
  read: "read",
  create_draft: "create",
  schedule: "schedule",
  publish: "publish",
  send_email: "send",
  delete: "delete",
  analytics: "analyze",
};

const GRANT_FLAG_BY_CAPABILITY: Readonly<
  Partial<Record<ProviderCapability, keyof WorkspacePermissionFlags>>
> = {
  read: "canRead",
  create: "canCreateDraft",
  schedule: "canSchedule",
  publish: "canPublish",
  send: "canSendEmail",
  delete: "canDelete",
};

export function toCanonicalCapability(
  value: string,
): ProviderCapability | null {
  if (value in LEGACY_TO_CANONICAL) return LEGACY_TO_CANONICAL[value];
  if (
    value === "connect" ||
    value === "read" ||
    value === "analyze" ||
    value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "upload" ||
    value === "download" ||
    value === "sync" ||
    value === "schedule" ||
    value === "publish" ||
    value === "send"
  ) {
    return value;
  }
  return null;
}

export function toLegacyCapability(
  capability: ProviderCapability,
):
  | "read"
  | "create_draft"
  | "schedule"
  | "publish"
  | "send_email"
  | "delete"
  | "analytics"
  | null {
  switch (capability) {
    case "read":
      return "read";
    case "create":
      return "create_draft";
    case "schedule":
      return "schedule";
    case "publish":
      return "publish";
    case "send":
      return "send_email";
    case "delete":
      return "delete";
    case "analyze":
      return "analytics";
    default:
      return null;
  }
}

export function grantedCapabilitiesFromFlags(
  flags: WorkspacePermissionFlags | null | undefined,
): readonly ProviderCapability[] {
  const source = flags ?? SAFE_PERMISSIONS;
  const granted: ProviderCapability[] = [];
  for (const [capability, flag] of Object.entries(GRANT_FLAG_BY_CAPABILITY) as [
    ProviderCapability,
    keyof WorkspacePermissionFlags,
  ][]) {
    if (source[flag]) granted.push(capability);
  }
  return granted;
}

export function flagsFromGrantedCapabilities(
  capabilities: readonly ProviderCapability[],
): WorkspacePermissionFlags {
  const set = new Set(capabilities);
  return {
    canRead: set.has("read"),
    canCreateDraft: set.has("create"),
    canSchedule: set.has("schedule"),
    canPublish: set.has("publish"),
    canSendEmail: set.has("send"),
    canDelete: set.has("delete"),
  };
}

/**
 * Plan metadata is future-safe only. Until a server entitlement system exists,
 * this always returns true so production Gmail/YouTube actions are not blocked.
 */
export function isPlanEntitlementEnforced(): false {
  return false;
}

export function planAllowsProvider(
  _requiredPlan: CanonicalProviderDefinition["requiredPlan"],
  _currentPlan: string | null | undefined,
): boolean {
  void _requiredPlan;
  void _currentPlan;
  return true;
}

export function resolveCapabilityLayers(input: {
  readonly provider: CanonicalProviderDefinition;
  readonly connected: boolean;
  readonly flags: WorkspacePermissionFlags | null;
  readonly policyAllows: boolean;
}): {
  readonly declared: readonly ProviderCapability[];
  readonly implemented: readonly ProviderCapability[];
  readonly granted: readonly ProviderCapability[];
  readonly allowed: readonly ProviderCapability[];
} {
  const declared = input.provider.capabilities;
  const implemented = input.provider.implementedCapabilities;
  const granted = input.connected
    ? grantedCapabilitiesFromFlags(input.flags)
    : [];
  const grantedSet = new Set(granted);
  const implementedSet = new Set(implemented);
  const allowed = input.policyAllows
    ? declared.filter(
        (capability) =>
          implementedSet.has(capability) &&
          (capability === "connect" || grantedSet.has(capability)),
      )
    : [];
  return { declared, implemented, granted, allowed };
}
