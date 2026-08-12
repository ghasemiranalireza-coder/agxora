/**
 * Central authorization policy — server-side only.
 * UI hiding is not authorization.
 */

import type { Actor, CustomerAction, MembershipRole } from "./types";
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

export function roleAtLeast(role: MembershipRole, minimum: MembershipRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function can(actor: Actor, action: CustomerAction): boolean {
  return ROLE_PERMISSIONS[actor.role].includes(action);
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
  if (
    actor.organizationId !== resource.organizationId ||
    actor.workspaceId !== resource.workspaceId
  ) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
  if (!can(actor, action)) {
    throw new PersistenceError("forbidden", `Missing permission: ${action}`);
  }
}

export function assertAuthenticated(actor: Actor | null): asserts actor is Actor {
  if (!actor) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
}
