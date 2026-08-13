import type { MembershipRole } from "@/app/lib/tenancy/types";

export type OrganizationView = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly ownerEmail: string;
  readonly memberCount: number;
  readonly workspaceCount: number;
  readonly viewerRole: MembershipRole;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkspaceView = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly archivedAt: string | null;
  readonly isActive: boolean;
  readonly role: MembershipRole;
  readonly memberCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type MemberView = {
  readonly userId: string;
  readonly membershipId: string;
  readonly email: string;
  readonly name: string;
  readonly role: MembershipRole;
  readonly status: string;
  readonly joinedAt: string;
};

export type InvitationView = {
  readonly id: string;
  readonly workspaceId: string;
  readonly organizationId: string;
  readonly invitedEmail: string;
  readonly role: MembershipRole;
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly revokedAt: string | null;
  readonly invitedById: string;
  readonly createdAt: string;
};

export type InvitationPreview = {
  readonly invitedEmail: string;
  readonly role: MembershipRole;
  readonly workspaceName: string;
  readonly organizationName: string;
  readonly expiresAt: string;
  readonly status: "pending" | "expired" | "revoked" | "accepted";
};

export const CONTROL_AUDIT_ACTIONS = [
  "workspace_created",
  "workspace_updated",
  "workspace_archived",
  "member_invited",
  "invitation_revoked",
  "invitation_accepted",
  "member_removed",
  "member_role_changed",
  "workspace_switched",
  "organization_updated",
] as const;

export type ControlAuditAction = (typeof CONTROL_AUDIT_ACTIONS)[number];
