/**
 * AGXORA Core Engine — public surface.
 */

export * from "./ids";
export * from "./types";
export * from "./bus/EventBus";
export * from "./registries/ModuleRegistry";
export * from "./registries/AppRegistry";
export * from "./registries/NavigationRegistry";
export * from "./engines/SettingsEngine";
export * from "./engines/ConfigurationEngine";
export * from "./engines/FeatureFlagEngine";
export * from "./engines/PermissionEngine";
export * from "./engines/WorkspaceEngine";
export * from "./engines/MemoryEngine";
export * from "./engines/NotificationEngine";
export * from "./engines/ExtensionEngine";
export * from "./plugins/PluginSystem";
export * from "./api/ApiLayer";
export * from "./modules/catalog";
export * from "./modules/registerBuiltinModules";
export type { CoreEngine, CoreEngineDeps } from "./engine/CoreEngine";
export { createCoreEngine } from "./engine/createCoreEngine";
export type { CreateCoreEngineOptions } from "./engine/createCoreEngine";
export { CoreEngineProvider, CoreEngineContext } from "./engine/CoreEngineProvider";
export { useCoreEngine, useOptionalCoreEngine } from "./engine/useCoreEngine";
