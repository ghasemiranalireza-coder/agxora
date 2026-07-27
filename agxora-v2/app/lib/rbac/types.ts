export type RbacRoleId = string & { readonly __brand: "RbacRoleId" };
export type PermissionAction =
  | "read"
  | "write"
  | "manage"
  | "execute"
  | "invite"
  | "billing";

export type PermissionResource =
  | "organization"
  | "workspace"
  | "module"
  | "agent"
  | "workflow"
  | "knowledge"
  | "chat"
  | "settings";

export interface Permission {
  readonly id: string;
  readonly action: PermissionAction;
  readonly resource: PermissionResource;
  readonly description?: string;
}

export interface RoleDefinition {
  readonly id: RbacRoleId;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly system: boolean;
}

export interface RoleAssignment {
  readonly subjectId: string;
  readonly roleId: RbacRoleId;
  readonly organizationId: string;
  readonly workspaceId?: string;
  readonly assignedAt: string;
}

export function asRbacRoleId(value: string): RbacRoleId {
  return value as RbacRoleId;
}
