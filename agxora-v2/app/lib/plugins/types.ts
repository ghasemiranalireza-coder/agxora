export type PluginLifecycle =
  | "discovered"
  | "installed"
  | "activated"
  | "deactivated"
  | "failed";

export type PluginSlot =
  | "module"
  | "agent"
  | "workflow"
  | "panel"
  | "command"
  | "provider";

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly slots: readonly PluginSlot[];
  readonly permissions: readonly string[];
  readonly entry?: string;
}

export interface PluginRecord {
  readonly manifest: PluginManifest;
  readonly lifecycle: PluginLifecycle;
  readonly installedAt?: string;
  readonly activatedAt?: string;
}
