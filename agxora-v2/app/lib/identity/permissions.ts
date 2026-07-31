/**
 * Module permission matrix — architecture only.
 * Maps platform roles to module access levels.
 */

import type { MembershipRole } from "../organization/types";
import type { IdentityRole, ModuleAccessKey, PermissionRecord } from "./types";

export function toIdentityRole(role: MembershipRole): IdentityRole {
  switch (role) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "manager":
      return "manager";
    case "guest":
    case "viewer":
      return "guest";
    default:
      return "employee";
  }
}

/** Spec: Finance=Admin, CRM=Manager+Employee, Documents=Everyone, Automation=Admin, Settings=Owner */
export const MODULE_PERMISSION_MATRIX: readonly PermissionRecord[] = [
  { id: "p-fin-owner", role: "owner", module: "finance", action: "admin", allowed: true },
  { id: "p-fin-admin", role: "admin", module: "finance", action: "admin", allowed: true },
  { id: "p-fin-mgr", role: "manager", module: "finance", action: "read", allowed: false },
  { id: "p-fin-emp", role: "employee", module: "finance", action: "read", allowed: false },
  { id: "p-fin-gst", role: "guest", module: "finance", action: "read", allowed: false },

  { id: "p-crm-owner", role: "owner", module: "crm", action: "manage", allowed: true },
  { id: "p-crm-admin", role: "admin", module: "crm", action: "manage", allowed: true },
  { id: "p-crm-mgr", role: "manager", module: "crm", action: "write", allowed: true },
  { id: "p-crm-emp", role: "employee", module: "crm", action: "write", allowed: true },
  { id: "p-crm-gst", role: "guest", module: "crm", action: "read", allowed: false },

  { id: "p-doc-owner", role: "owner", module: "documents", action: "manage", allowed: true },
  { id: "p-doc-admin", role: "admin", module: "documents", action: "manage", allowed: true },
  { id: "p-doc-mgr", role: "manager", module: "documents", action: "write", allowed: true },
  { id: "p-doc-emp", role: "employee", module: "documents", action: "write", allowed: true },
  { id: "p-doc-gst", role: "guest", module: "documents", action: "read", allowed: true },

  { id: "p-aut-owner", role: "owner", module: "automation", action: "admin", allowed: true },
  { id: "p-aut-admin", role: "admin", module: "automation", action: "admin", allowed: true },
  { id: "p-aut-mgr", role: "manager", module: "automation", action: "read", allowed: false },
  { id: "p-aut-emp", role: "employee", module: "automation", action: "read", allowed: false },
  { id: "p-aut-gst", role: "guest", module: "automation", action: "read", allowed: false },

  { id: "p-set-owner", role: "owner", module: "settings", action: "manage", allowed: true },
  { id: "p-set-admin", role: "admin", module: "settings", action: "manage", allowed: false },
  { id: "p-set-mgr", role: "manager", module: "settings", action: "read", allowed: false },
  { id: "p-set-emp", role: "employee", module: "settings", action: "read", allowed: false },
  { id: "p-set-gst", role: "guest", module: "settings", action: "read", allowed: false },

  { id: "p-cre-owner", role: "owner", module: "creator", action: "manage", allowed: true },
  { id: "p-cre-admin", role: "admin", module: "creator", action: "manage", allowed: true },
  { id: "p-cre-mgr", role: "manager", module: "creator", action: "write", allowed: true },
  { id: "p-cre-emp", role: "employee", module: "creator", action: "write", allowed: true },
  { id: "p-cre-gst", role: "guest", module: "creator", action: "read", allowed: false },

  { id: "p-prj-owner", role: "owner", module: "projects", action: "manage", allowed: true },
  { id: "p-prj-admin", role: "admin", module: "projects", action: "manage", allowed: true },
  { id: "p-prj-mgr", role: "manager", module: "projects", action: "write", allowed: true },
  { id: "p-prj-emp", role: "employee", module: "projects", action: "write", allowed: true },
  { id: "p-prj-gst", role: "guest", module: "projects", action: "read", allowed: true },

  { id: "p-team-owner", role: "owner", module: "team", action: "manage", allowed: true },
  { id: "p-team-admin", role: "admin", module: "team", action: "manage", allowed: true },
  { id: "p-team-mgr", role: "manager", module: "team", action: "write", allowed: true },
  { id: "p-team-emp", role: "employee", module: "team", action: "read", allowed: false },
  { id: "p-team-gst", role: "guest", module: "team", action: "read", allowed: false },
] as const;

export const IDENTITY_ROLES: readonly {
  readonly key: IdentityRole;
  readonly name: string;
  readonly description: string;
}[] = [
  { key: "owner", name: "Owner", description: "Full organization control including Settings and billing." },
  { key: "admin", name: "Admin", description: "Manage Finance, Automation, Team, and workspace modules." },
  { key: "manager", name: "Manager", description: "Lead CRM, Projects, Documents, and Creator operations." },
  { key: "employee", name: "Employee", description: "Day-to-day CRM, Documents, Creator, and Projects access." },
  { key: "guest", name: "Guest", description: "Limited read access to Documents and Projects." },
] as const;

export function canAccessModule(
  role: MembershipRole | IdentityRole | null | undefined,
  module: ModuleAccessKey,
): boolean {
  if (!role) return false;
  const identityRole = (
    ["owner", "admin", "manager", "employee", "guest"] as const
  ).includes(role as IdentityRole)
    ? (role as IdentityRole)
    : toIdentityRole(role as MembershipRole);

  const rows = MODULE_PERMISSION_MATRIX.filter(
    (row) => row.role === identityRole && row.module === module,
  );
  if (rows.length === 0) return false;
  return rows.some((row) => row.allowed);
}

export function describeModuleAccess(module: ModuleAccessKey): string {
  switch (module) {
    case "finance":
      return "Admin only";
    case "crm":
      return "Manager + Employee";
    case "documents":
      return "Everyone";
    case "automation":
      return "Admin";
    case "settings":
      return "Owner";
    case "creator":
      return "Manager + Employee";
    case "projects":
      return "Manager + Employee (+ Guest read)";
    case "team":
      return "Admin + Manager";
  }
}
