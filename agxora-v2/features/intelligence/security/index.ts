/**
 * Intelligence security — RBAC visibility + workspace isolation.
 */

import type { IntelligencePermission } from "../types";

export type IntelligenceRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "viewer"
  | "guest"
  | "employee";

const MATRIX: Record<IntelligenceRole, readonly IntelligencePermission[]> = {
  owner: [
    "intelligence.read",
    "intelligence.export",
    "intelligence.admin",
    "intelligence.executive",
  ],
  admin: [
    "intelligence.read",
    "intelligence.export",
    "intelligence.admin",
    "intelligence.executive",
  ],
  manager: [
    "intelligence.read",
    "intelligence.export",
    "intelligence.executive",
  ],
  member: ["intelligence.read"],
  viewer: ["intelligence.read"],
  guest: [],
  employee: ["intelligence.read"],
};

export function canIntelligence(
  role: string | null | undefined,
  permission: IntelligencePermission,
): boolean {
  const key = (role ?? "viewer").toLowerCase() as IntelligenceRole;
  const perms = MATRIX[key] ?? MATRIX.viewer;
  return perms.includes(permission);
}

export function assertOrgIsolation(
  organizationId: string,
  resourceOrganizationId: string,
): void {
  if (organizationId !== resourceOrganizationId) {
    throw new Error("Workspace isolation violation");
  }
}
