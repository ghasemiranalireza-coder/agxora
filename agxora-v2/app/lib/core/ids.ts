/**
 * AGXORA Core Engine — branded identifiers.
 * Opaque string brands ready for UUID / ULID backends.
 */

export type ModuleId = string & { readonly __brand: "ModuleId" };
export type AppId = string & { readonly __brand: "AppId" };
export type NavItemId = string & { readonly __brand: "NavItemId" };
export type PermissionId = string & { readonly __brand: "PermissionId" };
export type SettingKey = string & { readonly __brand: "SettingKey" };
export type FeatureFlagKey = string & { readonly __brand: "FeatureFlagKey" };
export type ExtensionId = string & { readonly __brand: "ExtensionId" };
export type PluginId = string & { readonly __brand: "PluginId" };
export type NotificationId = string & { readonly __brand: "NotificationId" };
export type EventType = string & { readonly __brand: "EventType" };
export type ConversationId = string & { readonly __brand: "ConversationId" };
export type MessageId = string & { readonly __brand: "MessageId" };
export type MemoryScopeId = string & { readonly __brand: "MemoryScopeId" };
export type ConfigKey = string & { readonly __brand: "ConfigKey" };

export function asModuleId(value: string): ModuleId {
  return value as ModuleId;
}

export function asAppId(value: string): AppId {
  return value as AppId;
}

export function asNavItemId(value: string): NavItemId {
  return value as NavItemId;
}

export function asPermissionId(value: string): PermissionId {
  return value as PermissionId;
}

export function asSettingKey(value: string): SettingKey {
  return value as SettingKey;
}

export function asFeatureFlagKey(value: string): FeatureFlagKey {
  return value as FeatureFlagKey;
}

export function asExtensionId(value: string): ExtensionId {
  return value as ExtensionId;
}

export function asPluginId(value: string): PluginId {
  return value as PluginId;
}

export function asNotificationId(value: string): NotificationId {
  return value as NotificationId;
}

export function asEventType(value: string): EventType {
  return value as EventType;
}

export function asConversationId(value: string): ConversationId {
  return value as ConversationId;
}

export function asMessageId(value: string): MessageId {
  return value as MessageId;
}

export function asMemoryScopeId(value: string): MemoryScopeId {
  return value as MemoryScopeId;
}

export function asConfigKey(value: string): ConfigKey {
  return value as ConfigKey;
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
