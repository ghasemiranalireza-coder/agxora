/**
 * Workflow IAM helpers — respects Identity & Access Management roles.
 */

import type { WorkflowPermission } from "../types";

export type AutomationRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "viewer"
  | "guest";

const MATRIX: Record<AutomationRole, readonly WorkflowPermission[]> = {
  owner: [
    "workflow.read",
    "workflow.write",
    "workflow.execute",
    "workflow.admin",
  ],
  admin: [
    "workflow.read",
    "workflow.write",
    "workflow.execute",
    "workflow.admin",
  ],
  manager: ["workflow.read", "workflow.write", "workflow.execute"],
  member: ["workflow.read", "workflow.execute"],
  viewer: ["workflow.read"],
  guest: [],
};

export function canWorkflow(
  role: AutomationRole | string | null | undefined,
  permission: WorkflowPermission,
): boolean {
  const key = (role ?? "viewer").toLowerCase() as AutomationRole;
  const perms = MATRIX[key] ?? MATRIX.viewer;
  return perms.includes(permission);
}

export function describeWorkflowAccess(role: AutomationRole | string): string {
  if (canWorkflow(role, "workflow.admin")) return "Admin";
  if (canWorkflow(role, "workflow.write")) return "Editor";
  if (canWorkflow(role, "workflow.execute")) return "Runner";
  if (canWorkflow(role, "workflow.read")) return "Viewer";
  return "None";
}
