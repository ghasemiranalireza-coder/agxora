import { createApiLayer } from "../api/ApiLayer";
import { CoreEvents, createEventBus } from "../bus/EventBus";
import { createAppRegistry } from "../registries/AppRegistry";
import { createModuleRegistry } from "../registries/ModuleRegistry";
import { createNavigationRegistry } from "../registries/NavigationRegistry";
import { createConfigurationEngine } from "../engines/ConfigurationEngine";
import { createExtensionEngine } from "../engines/ExtensionEngine";
import { createFeatureFlagEngine } from "../engines/FeatureFlagEngine";
import { createMemoryEngine } from "../engines/MemoryEngine";
import { createNotificationEngine } from "../engines/NotificationEngine";
import { createPermissionEngine } from "../engines/PermissionEngine";
import { createSettingsEngine } from "../engines/SettingsEngine";
import { createWorkspaceEngine } from "../engines/WorkspaceEngine";
import { asFeatureFlagKey } from "../ids";
import { createPluginSystem } from "../plugins/PluginSystem";
import { registerBuiltinModules } from "../modules/registerBuiltinModules";
import type { CoreEngine } from "./CoreEngine";

export interface CreateCoreEngineOptions {
  readonly registerBuiltins?: boolean;
  readonly workspaceId?: string | null;
  readonly organizationId?: string | null;
}

export function createCoreEngine(
  options: CreateCoreEngineOptions = {},
): CoreEngine {
  const events = createEventBus();
  const modules = createModuleRegistry();
  const apps = createAppRegistry();
  const navigation = createNavigationRegistry();
  const settings = createSettingsEngine();
  const workspace = createWorkspaceEngine({
    workspaceId: options.workspaceId ?? null,
    organizationId: options.organizationId ?? null,
    kind: options.workspaceId ? "organization" : null,
    name: null,
  });
  const memory = createMemoryEngine();
  const permissions = createPermissionEngine();
  const extensions = createExtensionEngine();
  const plugins = createPluginSystem();
  const config = createConfigurationEngine({
    "core.version": "0.1.0",
    "core.environment": "development",
    "api.baseUrl": "",
    "chat.streamingEnabled": false,
    "chat.aiConnected": false,
    "memory.enabled": true,
  });
  const flags = createFeatureFlagEngine([
    {
      key: asFeatureFlagKey("core.plugins"),
      enabled: false,
      description: "Future plugin loading",
    },
    {
      key: asFeatureFlagKey("core.marketplace"),
      enabled: false,
      description: "Marketplace (not built in this phase)",
    },
    {
      key: asFeatureFlagKey("chat.ai"),
      enabled: false,
      description: "Real AI responses — awaiting backend",
    },
    {
      key: asFeatureFlagKey("chat.streaming"),
      enabled: false,
      description: "Streaming chat responses",
    },
    {
      key: asFeatureFlagKey("memory.ai"),
      enabled: false,
      description: "AI memory pipelines",
    },
  ]);
  const notifications = createNotificationEngine();
  const api = createApiLayer();

  let ready = false;

  const engine: CoreEngine = {
    version: "0.1.0",
    get ready() {
      return ready;
    },
    events,
    modules,
    apps,
    navigation,
    settings,
    workspace,
    memory,
    permissions,
    extensions,
    plugins,
    config,
    flags,
    notifications,
    api,
    markReady() {
      if (ready) return;
      ready = true;
      events.publish({
        type: CoreEvents.ENGINE_READY,
        source: "core.engine",
        timestamp: new Date().toISOString(),
        payload: { version: engine.version },
      });
    },
  };

  if (options.registerBuiltins !== false) {
    registerBuiltinModules(engine);
  }

  engine.markReady();
  return engine;
}
