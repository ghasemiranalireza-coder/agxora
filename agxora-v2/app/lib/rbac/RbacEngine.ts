import { SYSTEM_PERMISSIONS, SYSTEM_ROLES } from "./roles";
import type {
  Permission,
  RbacRoleId,
  RoleAssignment,
  RoleDefinition,
} from "./types";
import { asRbacRoleId } from "./types";

export class RbacEngine {
  private readonly roles = new Map<RbacRoleId, RoleDefinition>();
  private readonly permissions = new Map<string, Permission>();
  private readonly assignments: RoleAssignment[] = [];

  constructor() {
    for (const permission of SYSTEM_PERMISSIONS) {
      this.permissions.set(permission.id, permission);
    }
    for (const role of SYSTEM_ROLES) {
      this.roles.set(role.id, role);
    }
  }

  defineRole(role: RoleDefinition): void {
    this.roles.set(role.id, role);
  }

  listRoles(): readonly RoleDefinition[] {
    return [...this.roles.values()];
  }

  getRoleByKey(key: string): RoleDefinition | undefined {
    return [...this.roles.values()].find((role) => role.key === key);
  }

  assign(input: {
    subjectId: string;
    roleKey: string;
    organizationId: string;
    workspaceId?: string;
  }): RoleAssignment {
    const role = this.getRoleByKey(input.roleKey);
    if (!role) throw new Error(`Unknown role: ${input.roleKey}`);

    const assignment: RoleAssignment = {
      subjectId: input.subjectId,
      roleId: role.id,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      assignedAt: new Date().toISOString(),
    };
    this.assignments.push(assignment);
    return assignment;
  }

  listAssignments(subjectId: string): readonly RoleAssignment[] {
    return this.assignments.filter((item) => item.subjectId === subjectId);
  }

  can(input: {
    subjectId: string;
    permissionId: string;
    organizationId: string;
  }): boolean {
    if (!this.permissions.has(input.permissionId)) return false;

    const relevant = this.assignments.filter(
      (item) =>
        item.subjectId === input.subjectId &&
        item.organizationId === input.organizationId,
    );

    for (const assignment of relevant) {
      const role = this.roles.get(assignment.roleId);
      if (role?.permissions.includes(input.permissionId)) return true;
    }
    return false;
  }

  bootstrapOwner(subjectId: string, organizationId: string): RoleAssignment {
    return this.assign({
      subjectId,
      roleKey: "owner",
      organizationId,
    });
  }

  ensureTemplateRoles(roleKeys: readonly string[]): void {
    for (const key of roleKeys) {
      if (this.getRoleByKey(key)) continue;
      this.defineRole({
        id: asRbacRoleId(`role.${key}`),
        key,
        name: key
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        description: `Template role: ${key}`,
        permissions: ["organization.read", "workspace.read", "module.read", "chat.write"],
        system: false,
      });
    }
  }
}

export const rbacEngine = new RbacEngine();
