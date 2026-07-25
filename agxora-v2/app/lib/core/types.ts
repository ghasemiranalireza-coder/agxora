/**
 * AGXORA Core Engine — universal contracts.
 *
 * Industry-agnostic. No laundry, restaurant, hotel, or vertical knowledge.
 * Applications and modules plug into these contracts later.
 */

import type {
  AppId,
  ConfigKey,
  ExtensionId,
  FeatureFlagKey,
  ModuleId,
  NavItemId,
  NotificationId,
  PermissionId,
  PluginId,
  SettingKey,
} from "./ids";

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export type ModuleStatus =
  | "registered"
  | "active"
  | "inactive"
  | "loading"
  | "error"
  | "deprecated";

export type ModuleCapability =
  | "ui"
  | "api"
  | "settings"
  | "navigation"
  | "permissions"
  | "events"
  | "storage"
  | "ai"
  | "automation"
  | "notifications"
  | "extensions";

export interface ModuleRouteDefinition {
  readonly path: string;
  readonly label: string;
  readonly exact?: boolean;
  readonly protected?: boolean;
}

export interface ModuleNavigationDefinition {
  readonly id: NavItemId;
  readonly label: string;
  readonly href: string;
  readonly icon?: string;
  readonly order?: number;
  readonly parentId?: NavItemId;
  readonly section?: string;
}

export interface ModuleSettingDefinition {
  readonly key: SettingKey;
  readonly label: string;
  readonly description?: string;
  readonly type: "boolean" | "string" | "number" | "enum" | "json";
  readonly defaultValue: unknown;
  readonly options?: readonly string[];
  readonly scope: "user" | "workspace" | "organization" | "system";
}

export interface ModuleManifest {
  readonly id: ModuleId;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly version: string;
  readonly status: ModuleStatus;
  readonly permissions: readonly PermissionId[];
  readonly routes: readonly ModuleRouteDefinition[];
  readonly navigation: readonly ModuleNavigationDefinition[];
  readonly settings: readonly ModuleSettingDefinition[];
  readonly capabilities: readonly ModuleCapability[];
  readonly dependencies?: readonly ModuleId[];
  readonly optional?: boolean;
}

/* ------------------------------------------------------------------ */
/* App Registry                                                        */
/* ------------------------------------------------------------------ */

export type AppKind = "core" | "system" | "module" | "extension" | "plugin";

export interface AppDescriptor {
  readonly id: AppId;
  readonly moduleId: ModuleId;
  readonly name: string;
  readonly kind: AppKind;
  readonly version: string;
  readonly entryRoute?: string;
  readonly icon?: string;
  readonly enabled: boolean;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export interface NavigationEntry extends ModuleNavigationDefinition {
  readonly moduleId: ModuleId;
  readonly visible: boolean;
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export type PermissionEffect = "allow" | "deny";

export interface PermissionDefinition {
  readonly id: PermissionId;
  readonly moduleId: ModuleId;
  readonly action: string;
  readonly resource: string;
  readonly description?: string;
}

export interface PermissionGrant {
  readonly permissionId: PermissionId;
  readonly subjectId: string;
  readonly effect: PermissionEffect;
  readonly workspaceId?: string;
  readonly organizationId?: string;
}

/* ------------------------------------------------------------------ */
/* Settings / Configuration / Flags                                    */
/* ------------------------------------------------------------------ */

export type SettingScope = "user" | "workspace" | "organization" | "system";

export interface SettingValue {
  readonly key: SettingKey;
  readonly scope: SettingScope;
  readonly scopeId: string;
  readonly value: unknown;
  readonly updatedAt: string;
}

export interface ConfigEntry {
  readonly key: ConfigKey;
  readonly value: unknown;
  readonly source: "default" | "env" | "runtime" | "remote";
  readonly readonly?: boolean;
}

export interface FeatureFlag {
  readonly key: FeatureFlagKey;
  readonly enabled: boolean;
  readonly description?: string;
  readonly rolloutPercent?: number;
  readonly workspaceIds?: readonly string[];
  readonly organizationIds?: readonly string[];
}

/* ------------------------------------------------------------------ */
/* Extensions / Plugins                                                */
/* ------------------------------------------------------------------ */

export type ExtensionPoint =
  | "navigation"
  | "settings"
  | "commands"
  | "panels"
  | "hooks"
  | "providers"
  | "api";

export interface ExtensionContribution {
  readonly id: ExtensionId;
  readonly point: ExtensionPoint;
  readonly moduleId: ModuleId;
  readonly payload: Record<string, unknown>;
  readonly enabled: boolean;
}

export type PluginLifecycle = "discovered" | "installed" | "activated" | "deactivated" | "failed";

export interface PluginDescriptor {
  readonly id: PluginId;
  readonly name: string;
  readonly version: string;
  readonly moduleId?: ModuleId;
  readonly lifecycle: PluginLifecycle;
  readonly permissions: readonly PermissionId[];
  readonly entry?: string;
  readonly metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationLevel = "info" | "success" | "warning" | "error" | "system";

export interface NotificationRecord {
  readonly id: NotificationId;
  readonly level: NotificationLevel;
  readonly title: string;
  readonly body?: string;
  readonly moduleId?: ModuleId;
  readonly workspaceId?: string;
  readonly read: boolean;
  readonly createdAt: string;
  readonly href?: string;
  readonly meta?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Memory (architecture only)                                          */
/* ------------------------------------------------------------------ */

export type MemoryScopeKind =
  | "workspace"
  | "organization"
  | "user"
  | "preferences"
  | "history"
  | "knowledge"
  | "context"
  | "conversation";

export interface MemoryScope {
  readonly kind: MemoryScopeKind;
  readonly id: string;
}

export interface MemoryRecord {
  readonly id: string;
  readonly scope: MemoryScope;
  readonly key: string;
  readonly value: unknown;
  readonly tags?: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
}

/* ------------------------------------------------------------------ */
/* Workspace engine view (universal)                                   */
/* ------------------------------------------------------------------ */

export type WorkspaceKind =
  | "personal"
  | "team"
  | "organization"
  | "enterprise"
  | "sandbox";

export interface WorkspaceContext {
  readonly workspaceId: string | null;
  readonly organizationId: string | null;
  readonly kind: WorkspaceKind | null;
  readonly name: string | null;
  readonly isolated: true;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export interface CoreEvent<TPayload = unknown> {
  readonly type: string;
  readonly source: string;
  readonly timestamp: string;
  readonly workspaceId?: string | null;
  readonly organizationId?: string | null;
  readonly correlationId?: string;
  readonly payload: TPayload;
}

export type EventHandler<TPayload = unknown> = (event: CoreEvent<TPayload>) => void;

export interface Unsubscribe {
  (): void;
}

/* ------------------------------------------------------------------ */
/* Future API Layer                                                    */
/* ------------------------------------------------------------------ */

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequest<TBody = unknown> {
  readonly path: string;
  readonly method: ApiMethod;
  readonly body?: TBody;
  readonly query?: Record<string, string | number | boolean | undefined>;
  readonly headers?: Record<string, string>;
  readonly workspaceId?: string;
  readonly organizationId?: string;
}

export interface ApiResponse<TData = unknown> {
  readonly ok: boolean;
  readonly status: number;
  readonly data?: TData;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export interface ApiPort {
  request<TData = unknown, TBody = unknown>(
    req: ApiRequest<TBody>,
  ): Promise<ApiResponse<TData>>;
}
