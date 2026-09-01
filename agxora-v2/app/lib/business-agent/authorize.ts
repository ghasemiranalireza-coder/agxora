import "server-only";

import { roleAtLeast } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { IntegrationPermissionFlags } from "./catalog";

export type SideEffectPermission =
  | "read"
  | "create_draft"
  | "schedule"
  | "publish"
  | "send_email"
  | "delete";

export function assertCanManageIntegrations(actor: Actor): void {
  if (!roleAtLeast(actor.role, "ADMIN")) {
    throw new PersistenceError(
      "forbidden",
      "Only owners and admins can manage integrations",
    );
  }
}

export function assertCanChangeAutonomy(actor: Actor): void {
  if (!roleAtLeast(actor.role, "OWNER")) {
    throw new PersistenceError(
      "forbidden",
      "Only the organization owner can change autonomy mode",
    );
  }
}

export function permissionGranted(
  flags: IntegrationPermissionFlags,
  permission: SideEffectPermission,
): boolean {
  switch (permission) {
    case "read":
      return flags.canRead;
    case "create_draft":
      return flags.canCreateDraft;
    case "schedule":
      return flags.canSchedule;
    case "publish":
      return flags.canPublish;
    case "send_email":
      return flags.canSendEmail;
    case "delete":
      return flags.canDelete;
    default:
      return false;
  }
}

export function isSideEffect(permission: SideEffectPermission): boolean {
  return (
    permission === "schedule" ||
    permission === "publish" ||
    permission === "send_email" ||
    permission === "delete"
  );
}
