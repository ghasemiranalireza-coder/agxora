/**
 * AGXORA Core Engine — the Universal Operating System foundation.
 *
 * Every future capability plugs into this surface.
 */

import type { EventBus } from "../bus/EventBus";
import type { ApiLayer } from "../api/ApiLayer";
import type { AppRegistry } from "../registries/AppRegistry";
import type { ModuleRegistry } from "../registries/ModuleRegistry";
import type { NavigationRegistry } from "../registries/NavigationRegistry";
import type { ConfigurationEngine } from "../engines/ConfigurationEngine";
import type { ExtensionEngine } from "../engines/ExtensionEngine";
import type { FeatureFlagEngine } from "../engines/FeatureFlagEngine";
import type { MemoryEngine } from "../engines/MemoryEngine";
import type { NotificationEngine } from "../engines/NotificationEngine";
import type { PermissionEngine } from "../engines/PermissionEngine";
import type { SettingsEngine } from "../engines/SettingsEngine";
import type { WorkspaceEngine } from "../engines/WorkspaceEngine";
import type { PluginSystem } from "../plugins/PluginSystem";

export interface CoreEngine {
  readonly version: string;
  readonly ready: boolean;
  readonly events: EventBus;
  readonly modules: ModuleRegistry;
  readonly apps: AppRegistry;
  readonly navigation: NavigationRegistry;
  readonly settings: SettingsEngine;
  readonly workspace: WorkspaceEngine;
  readonly memory: MemoryEngine;
  readonly permissions: PermissionEngine;
  readonly extensions: ExtensionEngine;
  readonly plugins: PluginSystem;
  readonly config: ConfigurationEngine;
  readonly flags: FeatureFlagEngine;
  readonly notifications: NotificationEngine;
  readonly api: ApiLayer;
  markReady(): void;
}

export interface CoreEngineDeps {
  readonly events: EventBus;
  readonly modules: ModuleRegistry;
  readonly apps: AppRegistry;
  readonly navigation: NavigationRegistry;
  readonly settings: SettingsEngine;
  readonly workspace: WorkspaceEngine;
  readonly memory: MemoryEngine;
  readonly permissions: PermissionEngine;
  readonly extensions: ExtensionEngine;
  readonly plugins: PluginSystem;
  readonly config: ConfigurationEngine;
  readonly flags: FeatureFlagEngine;
  readonly notifications: NotificationEngine;
  readonly api: ApiLayer;
}
