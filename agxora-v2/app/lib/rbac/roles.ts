import { asRbacRoleId, type Permission, type RoleDefinition } from "./types";

export const SYSTEM_PERMISSIONS: readonly Permission[] = [
  { id: "organization.read", action: "read", resource: "organization" },
  { id: "organization.manage", action: "manage", resource: "organization" },
  { id: "workspace.read", action: "read", resource: "workspace" },
  { id: "workspace.manage", action: "manage", resource: "workspace" },
  { id: "module.read", action: "read", resource: "module" },
  { id: "module.write", action: "write", resource: "module" },
  { id: "agent.execute", action: "execute", resource: "agent" },
  { id: "workflow.execute", action: "execute", resource: "workflow" },
  { id: "knowledge.read", action: "read", resource: "knowledge" },
  { id: "knowledge.write", action: "write", resource: "knowledge" },
  { id: "chat.write", action: "write", resource: "chat" },
  { id: "settings.manage", action: "manage", resource: "settings" },
  { id: "billing.manage", action: "billing", resource: "settings" },
  { id: "invite.write", action: "invite", resource: "organization" },
] as const;

const ALL = SYSTEM_PERMISSIONS.map((p) => p.id);
const OPERATOR = ALL.filter(
  (id) => !id.includes("billing") && id !== "organization.manage",
);
const MEMBER = [
  "organization.read",
  "workspace.read",
  "module.read",
  "module.write",
  "agent.execute",
  "workflow.execute",
  "knowledge.read",
  "chat.write",
];
const VIEWER = [
  "organization.read",
  "workspace.read",
  "module.read",
  "knowledge.read",
];

export const SYSTEM_ROLES: readonly RoleDefinition[] = [
  {
    id: asRbacRoleId("role.owner"),
    key: "owner",
    name: "Owner",
    description: "Full control of the organization",
    permissions: ALL,
    system: true,
  },
  {
    id: asRbacRoleId("role.admin"),
    key: "admin",
    name: "Admin",
    description: "Manage workspace, people, and modules",
    permissions: OPERATOR,
    system: true,
  },
  {
    id: asRbacRoleId("role.member"),
    key: "member",
    name: "Member",
    description: "Day-to-day operational access",
    permissions: MEMBER,
    system: true,
  },
  {
    id: asRbacRoleId("role.viewer"),
    key: "viewer",
    name: "Viewer",
    description: "Read-only access",
    permissions: VIEWER,
    system: true,
  },
] as const;
