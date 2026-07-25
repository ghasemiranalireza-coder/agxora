/**
 * Reserved universal module catalog.
 * Manifests only — no business logic.
 */

import {
  asAppId,
  asModuleId,
  asNavItemId,
  asPermissionId,
  asSettingKey,
} from "../ids";
import type { AppDescriptor, ModuleManifest } from "../types";

function perm(module: string, action: string, resource: string) {
  return asPermissionId(`${module}.${action}.${resource}`);
}

function nav(
  module: string,
  id: string,
  label: string,
  href: string,
  order: number,
) {
  return {
    id: asNavItemId(`${module}.${id}`),
    label,
    href,
    order,
    section: "modules",
  };
}

function setting(
  module: string,
  key: string,
  label: string,
  defaultValue: unknown,
  type: "boolean" | "string" | "number" | "enum" | "json" = "boolean",
) {
  return {
    key: asSettingKey(`${module}.${key}`),
    label,
    type,
    defaultValue,
    scope: "workspace" as const,
  };
}

const MODULE_NAMES = [
  "core",
  "chat",
  "crm",
  "finance",
  "analytics",
  "projects",
  "calendar",
  "documents",
  "automation",
  "knowledge",
  "marketplace",
  "ai",
  "workflow",
  "email",
  "storage",
] as const;

export type ReservedModuleName = (typeof MODULE_NAMES)[number];

function baseManifest(
  name: ReservedModuleName,
  displayName: string,
  options?: {
    status?: ModuleManifest["status"];
    capabilities?: ModuleManifest["capabilities"];
    routes?: ModuleManifest["routes"];
    navigation?: ModuleManifest["navigation"];
    optional?: boolean;
  },
): ModuleManifest {
  const id = asModuleId(name);
  return {
    id,
    name: displayName,
    icon: name,
    version: "0.1.0",
    status: options?.status ?? "registered",
    optional: options?.optional ?? (name !== "core" && name !== "chat"),
    permissions: [
      perm(name, "read", "module"),
      perm(name, "write", "module"),
    ],
    routes: options?.routes ?? [
      {
        path: `/modules/${name}`,
        label: displayName,
        protected: true,
      },
    ],
    navigation: options?.navigation ?? [
      nav(name, "root", displayName, `/modules/${name}`, 100),
    ],
    settings: [setting(name, "enabled", `${displayName} enabled`, true)],
    capabilities: options?.capabilities ?? ["ui", "settings", "navigation", "events"],
  };
}

export function createBuiltinModuleManifests(): ModuleManifest[] {
  return [
    baseManifest("core", "Core", {
      status: "active",
      capabilities: [
        "ui",
        "api",
        "settings",
        "navigation",
        "permissions",
        "events",
        "storage",
        "notifications",
        "extensions",
      ],
      routes: [{ path: "/dashboard", label: "Dashboard", protected: true }],
      navigation: [
        nav("core", "dashboard", "Dashboard", "/dashboard", 0),
      ],
    }),
    baseManifest("chat", "Chat", {
      status: "active",
      capabilities: ["ui", "ai", "events", "settings", "navigation"],
      routes: [{ path: "/dashboard#chat", label: "Chat", protected: true }],
      navigation: [nav("chat", "root", "Chat", "/dashboard#chat", 10)],
    }),
    baseManifest("crm", "CRM", { status: "registered" }),
    baseManifest("finance", "Finance", { status: "registered" }),
    baseManifest("analytics", "Analytics", { status: "registered" }),
    baseManifest("projects", "Projects", { status: "registered" }),
    baseManifest("calendar", "Calendar", { status: "registered" }),
    baseManifest("documents", "Documents", { status: "registered" }),
    baseManifest("automation", "Automation", { status: "registered" }),
    baseManifest("knowledge", "Knowledge", { status: "registered" }),
    baseManifest("marketplace", "Marketplace", { status: "registered" }),
    baseManifest("ai", "AI", {
      status: "registered",
      capabilities: ["ai", "api", "events", "settings"],
    }),
    baseManifest("workflow", "Workflow", { status: "registered" }),
    baseManifest("email", "Email", { status: "registered" }),
    baseManifest("storage", "Storage", {
      status: "registered",
      capabilities: ["storage", "api", "settings", "events"],
    }),
  ];
}

export function createBuiltinAppDescriptors(
  manifests: readonly ModuleManifest[],
): AppDescriptor[] {
  return manifests.map((m) => ({
    id: asAppId(`app.${m.id}`),
    moduleId: m.id,
    name: m.name,
    kind: m.id === asModuleId("core") ? "core" : "module",
    version: m.version,
    entryRoute: m.routes[0]?.path,
    icon: m.icon,
    enabled: m.status === "active",
  }));
}
