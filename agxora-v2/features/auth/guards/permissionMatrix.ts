/**
 * Centralized IAM permission matrix — Owner / Admin / Manager / Member / Viewer.
 */

import type { IamPermission, IamRole, IamRoleDefinition } from "../types";

export const IAM_PERMISSIONS: readonly IamPermission[] = [
  {
    id: "organization.read",
    resource: "organization",
    action: "read",
    description: "View organization profile",
  },
  {
    id: "organization.manage",
    resource: "organization",
    action: "manage",
    description: "Update organization settings",
  },
  {
    id: "workspace.read",
    resource: "workspace",
    action: "read",
    description: "View workspaces",
  },
  {
    id: "workspace.manage",
    resource: "workspace",
    action: "manage",
    description: "Create and configure workspaces",
  },
  {
    id: "team.read",
    resource: "team",
    action: "read",
    description: "View team members",
  },
  {
    id: "team.invite",
    resource: "team",
    action: "invite",
    description: "Invite members (placeholder delivery)",
  },
  {
    id: "team.manage",
    resource: "team",
    action: "manage",
    description: "Change roles and remove members",
  },
  {
    id: "settings.manage",
    resource: "settings",
    action: "manage",
    description: "Manage identity and workspace settings",
  },
  {
    id: "security.manage",
    resource: "security",
    action: "manage",
    description: "Manage security and sessions",
  },
  {
    id: "billing.manage",
    resource: "billing",
    action: "billing",
    description: "Manage subscription and billing",
  },
  {
    id: "module.read",
    resource: "module",
    action: "read",
    description: "Read operational modules",
  },
  {
    id: "module.write",
    resource: "module",
    action: "write",
    description: "Write operational modules",
  },
  {
    id: "audit.read",
    resource: "audit",
    action: "read",
    description: "View audit activity",
  },
] as const;

const ALL = IAM_PERMISSIONS.map((p) => p.id);

const ADMIN = ALL.filter((id) => id !== "billing.manage");

const MANAGER = [
  "organization.read",
  "workspace.read",
  "team.read",
  "team.invite",
  "module.read",
  "module.write",
  "audit.read",
] as const;

const MEMBER = [
  "organization.read",
  "workspace.read",
  "team.read",
  "module.read",
  "module.write",
] as const;

const VIEWER = [
  "organization.read",
  "workspace.read",
  "team.read",
  "module.read",
] as const;

export const IAM_ROLES: readonly IamRoleDefinition[] = [
  {
    key: "owner",
    name: "Owner",
    description: "Full control including billing and ownership transfer",
    permissions: ALL,
    system: true,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Manage people, security, workspaces, and modules",
    permissions: ADMIN,
    system: true,
  },
  {
    key: "manager",
    name: "Manager",
    description: "Lead teams and operational modules; invite members",
    permissions: MANAGER,
    system: true,
  },
  {
    key: "member",
    name: "Member",
    description: "Day-to-day operational access",
    permissions: MEMBER,
    system: true,
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Read-only access",
    permissions: VIEWER,
    system: true,
  },
] as const;

const ROLE_SET = new Set<string>(IAM_ROLES.map((r) => r.key));

/** Normalize legacy membership roles into the IAM role set. */
export function normalizeIamRole(role: string | null | undefined): IamRole | null {
  if (!role) return null;
  if (ROLE_SET.has(role)) return role as IamRole;
  switch (role) {
    case "employee":
      return "member";
    case "guest":
      return "viewer";
    default:
      return null;
  }
}

export function getIamRoleDefinition(role: IamRole): IamRoleDefinition {
  return IAM_ROLES.find((r) => r.key === role)!;
}

export function roleHasPermission(
  role: string | null | undefined,
  permissionId: string,
): boolean {
  const normalized = normalizeIamRole(role);
  if (!normalized) return false;
  return getIamRoleDefinition(normalized).permissions.includes(permissionId);
}

export function listPermissionsForRole(role: IamRole): readonly string[] {
  return getIamRoleDefinition(role).permissions;
}

/** Matrix rows for settings / documentation UIs. */
export function buildPermissionMatrix(): ReadonlyArray<{
  readonly permissionId: string;
  readonly owner: boolean;
  readonly admin: boolean;
  readonly manager: boolean;
  readonly member: boolean;
  readonly viewer: boolean;
}> {
  return IAM_PERMISSIONS.map((permission) => ({
    permissionId: permission.id,
    owner: roleHasPermission("owner", permission.id),
    admin: roleHasPermission("admin", permission.id),
    manager: roleHasPermission("manager", permission.id),
    member: roleHasPermission("member", permission.id),
    viewer: roleHasPermission("viewer", permission.id),
  }));
}
