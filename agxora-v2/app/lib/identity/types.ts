/**
 * AGXORA Identity & Access — database-ready domain interfaces.
 * No live database connection yet. Architecture only.
 */

import type {
  MembershipRole,
  MembershipStatus,
  OrganizationId,
  UserId,
  WorkspaceId,
} from "../organization/types";

export type IdentityRole =
  | "owner"
  | "admin"
  | "manager"
  | "employee"
  | "guest";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type AccessErrorCode =
  | "unauthorized"
  | "forbidden"
  | "expired_session"
  | "missing_permission";

export type ModuleAccessKey =
  | "finance"
  | "crm"
  | "documents"
  | "automation"
  | "settings"
  | "creator"
  | "projects"
  | "team";

/** Future User table row. */
export interface UserRecord {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly emailVerified: boolean;
  readonly timezone: string;
  readonly language: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Future Organization table row. */
export interface OrganizationRecord {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly ownerUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Future Membership table row — user ↔ org/workspace. */
export interface MembershipRecord {
  readonly id: string;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly workspaceId: WorkspaceId;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Future Role catalog row. */
export interface RoleRecord {
  readonly id: string;
  readonly key: IdentityRole;
  readonly name: string;
  readonly description: string;
  readonly system: boolean;
}

/** Future Invitation table row. */
export interface InvitationRecord {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly workspaceId: WorkspaceId;
  readonly email: string;
  readonly role: MembershipRole;
  readonly status: InvitationStatus;
  readonly token: string;
  readonly invitedBy: UserId;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly acceptedAt?: string;
}

/** Future Session table row. */
export interface SessionRecord {
  readonly id: string;
  readonly userId: UserId;
  readonly deviceLabel: string;
  readonly userAgent: string;
  readonly ipHint: string;
  readonly trusted: boolean;
  readonly current: boolean;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly expiresAt: string;
}

/** Future Permission grant row. */
export interface PermissionRecord {
  readonly id: string;
  readonly role: IdentityRole;
  readonly module: ModuleAccessKey;
  readonly action: "read" | "write" | "manage" | "admin";
  readonly allowed: boolean;
}

export interface AccessDenial {
  readonly code: AccessErrorCode;
  readonly message: string;
  readonly requiredPermission?: string;
}
