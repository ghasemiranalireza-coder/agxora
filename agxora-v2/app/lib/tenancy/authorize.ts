/**
 * Central authorization policy — server-side only.
 * UI hiding is not authorization.
 *
 * Phase 42.1: customer CRM actions
 * Phase 44: organization / workspace / membership / invitation actions
 */

import type { Actor, ControlPlaneAction, CustomerAction, MembershipRole } from "./types";
import { PersistenceError } from "./errors";

const ROLE_RANK: Record<MembershipRole, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** Actions granted to each role (extensible). */
const ROLE_PERMISSIONS: Record<MembershipRole, readonly CustomerAction[]> = {
  OWNER: [
    "customer.read",
    "customer.create",
    "customer.update",
    "customer.delete",
  ],
  ADMIN: [
    "customer.read",
    "customer.create",
    "customer.update",
    "customer.delete",
  ],
  MEMBER: ["customer.read", "customer.create", "customer.update"],
};

const CONTROL_PERMISSIONS: Record<MembershipRole, readonly ControlPlaneAction[]> = {
  OWNER: [
    "organization.read",
    "organization.update",
    "workspace.read",
    "workspace.create",
    "workspace.update",
    "workspace.archive",
    "workspace.switch",
    "member.read",
    "member.invite",
    "member.role.change",
    "member.remove",
    "invitation.read",
    "invitation.revoke",
  ],
  ADMIN: [
    "organization.read",
    "organization.update",
    "workspace.read",
    "workspace.update",
    "workspace.switch",
    "member.read",
    "member.invite",
    "member.role.change",
    "member.remove",
    "invitation.read",
    "invitation.revoke",
  ],
  MEMBER: [
    "organization.read",
    "workspace.read",
    "workspace.switch",
    "member.read",
  ],
};

export function roleAtLeast(role: MembershipRole, minimum: MembershipRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function roleRank(role: MembershipRole): number {
  return ROLE_RANK[role];
}

export function can(actor: Actor, action: CustomerAction): boolean {
  return ROLE_PERMISSIONS[actor.role].includes(action);
}

export function canControl(actor: Actor, action: ControlPlaneAction): boolean {
  return CONTROL_PERMISSIONS[actor.role].includes(action);
}

function assertTenant(
  actor: Actor,
  resource: {
    readonly organizationId: string;
    readonly workspaceId?: string;
  },
): void {
  if (actor.organizationId !== resource.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
  if (resource.workspaceId && actor.workspaceId !== resource.workspaceId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
}

/**
 * Authorize an action against a workspace-scoped resource.
 * Tenant match is mandatory — IDs alone are never enough.
 */
export function assertCan(
  actor: Actor,
  action: CustomerAction,
  resource: {
    readonly organizationId: string;
    readonly workspaceId: string;
  },
): void {
  assertTenant(actor, resource);
  if (!can(actor, action)) {
    throw new PersistenceError("forbidden", `Missing permission: ${action}`);
  }
}

export function assertControl(
  actor: Actor,
  action: ControlPlaneAction,
  resource: {
    readonly organizationId: string;
    readonly workspaceId?: string;
  },
): void {
  assertTenant(actor, resource);
  if (!canControl(actor, action)) {
    throw new PersistenceError("forbidden", `Missing permission: ${action}`);
  }
}

/**
 * Inviter cannot grant a role at or above their own rank.
 * OWNER invitations are refused (exactly one workspace OWNER; transfer is future).
 */
export function assertCanGrantRole(actor: Actor, targetRole: MembershipRole): void {
  if (targetRole === "OWNER") {
    throw new PersistenceError(
      "forbidden",
      "Cannot grant OWNER; ownership transfer is not available",
    );
  }
  if (ROLE_RANK[actor.role] <= ROLE_RANK[targetRole]) {
    throw new PersistenceError("forbidden", "Cannot grant a role at or above your own");
  }
}

/**
 * ADMIN may only mutate MEMBER targets. OWNER may mutate ADMIN/MEMBER, never OWNER.
 */
export function assertCanManageTarget(
  actor: Actor,
  targetRole: MembershipRole,
  action: "member.role.change" | "member.remove",
): void {
  if (!canControl(actor, action)) {
    throw new PersistenceError("forbidden", `Missing permission: ${action}`);
  }
  if (targetRole === "OWNER") {
    throw new PersistenceError("forbidden", "Cannot modify the workspace OWNER");
  }
  if (actor.role === "ADMIN" && targetRole !== "MEMBER") {
    throw new PersistenceError("forbidden", "ADMIN can only manage MEMBER users");
  }
  if (ROLE_RANK[actor.role] <= ROLE_RANK[targetRole] && actor.role !== "OWNER") {
    throw new PersistenceError("forbidden", "Cannot manage a peer or higher role");
  }
}

export function assertAuthenticated(actor: Actor | null): asserts actor is Actor {
  if (!actor) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
}

export function validationError(
  message: string,
  details?: readonly { readonly field?: string; readonly message: string }[],
): never {
  throw new PersistenceError("validation", message, { status: 422, details });
}
