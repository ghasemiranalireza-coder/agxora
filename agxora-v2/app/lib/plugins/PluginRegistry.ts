import type { PluginManifest, PluginRecord } from "./types";

/**
 * Modular plugin architecture — install/activate without changing core.
 * Marketplace UI is intentionally out of scope.
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, PluginRecord>();

  discover(manifest: PluginManifest): PluginRecord {
    const record: PluginRecord = {
      manifest,
      lifecycle: "discovered",
    };
    this.plugins.set(manifest.id, record);
    return record;
  }

  install(manifest: PluginManifest): PluginRecord {
    const record: PluginRecord = {
      manifest,
      lifecycle: "installed",
      installedAt: new Date().toISOString(),
    };
    this.plugins.set(manifest.id, record);
    return record;
  }

  activate(id: string): PluginRecord {
    const current = this.require(id);
    const next: PluginRecord = {
      ...current,
      lifecycle: "activated",
      activatedAt: new Date().toISOString(),
    };
    this.plugins.set(id, next);
    return next;
  }

  deactivate(id: string): PluginRecord {
    const current = this.require(id);
    const next: PluginRecord = {
      ...current,
      lifecycle: "deactivated",
    };
    this.plugins.set(id, next);
    return next;
  }

  get(id: string): PluginRecord | undefined {
    return this.plugins.get(id);
  }

  list(): readonly PluginRecord[] {
    return [...this.plugins.values()];
  }

  listActivated(): readonly PluginRecord[] {
    return this.list().filter((item) => item.lifecycle === "activated");
  }

  private require(id: string): PluginRecord {
    const record = this.plugins.get(id);
    if (!record) throw new Error(`Unknown plugin: ${id}`);
    return record;
  }
}

export const pluginRegistry = new PluginRegistry();
