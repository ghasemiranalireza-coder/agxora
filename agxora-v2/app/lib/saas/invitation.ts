/**
 * Team invitation model — multi-tenant membership invitations.
 */

import type {
  MembershipRole,
  OrganizationId,
  UserId,
  WorkspaceId,
} from "../organization/types";

export type InvitationId = string & { readonly __brand: "InvitationId" };

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export interface TeamInvitation {
  readonly id: InvitationId;
  readonly organizationId: OrganizationId;
  readonly workspaceId: WorkspaceId;
  readonly email: string;
  readonly role: MembershipRole;
  readonly invitedBy: UserId;
  readonly token: string;
  readonly status: InvitationStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly acceptedAt?: string;
}

export function asInvitationId(value: string): InvitationId {
  return value as InvitationId;
}

export function createInvitationId(): InvitationId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return asInvitationId(`inv_${crypto.randomUUID()}`);
  }
  return asInvitationId(
    `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  );
}
