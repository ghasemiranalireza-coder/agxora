/**
 * Future Plugin System — architecture only.
 *
 * Developers will install modules without changing core.
 * Marketplace is intentionally out of scope.
 */

import type { PluginId } from "../ids";
import { asPluginId } from "../ids";
import type { ModuleManifest, PluginDescriptor, PluginLifecycle } from "../types";

export interface PluginInstallRequest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly entry?: string;
  readonly permissions?: PluginDescriptor["permissions"];
  readonly metadata?: Record<string, unknown>;
  /** Optional module manifest the plugin contributes when activated. */
  readonly manifest?: ModuleManifest;
}

export interface PluginSystem {
  discover(descriptor: PluginDescriptor): void;
  install(request: PluginInstallRequest): PluginDescriptor;
  activate(id: PluginId | string): PluginDescriptor;
  deactivate(id: PluginId | string): PluginDescriptor;
  uninstall(id: PluginId | string): boolean;
  get(id: PluginId | string): PluginDescriptor | undefined;
  list(lifecycle?: PluginLifecycle): readonly PluginDescriptor[];
  getPendingManifest(id: PluginId | string): ModuleManifest | undefined;
}

export function createPluginSystem(): PluginSystem {
  const plugins = new Map<PluginId, PluginDescriptor>();
  const manifests = new Map<PluginId, ModuleManifest>();

  const requirePlugin = (id: PluginId | string): PluginDescriptor => {
    const key = asPluginId(String(id));
    const plugin = plugins.get(key);
    if (!plugin) throw new Error(`Unknown plugin: ${id}`);
    return plugin;
  };

  return {
    discover(descriptor) {
      plugins.set(descriptor.id, { ...descriptor, lifecycle: "discovered" });
    },

    install(request) {
      const id = asPluginId(request.id);
      const descriptor: PluginDescriptor = {
        id,
        name: request.name,
        version: request.version,
        lifecycle: "installed",
        permissions: request.permissions ?? [],
        entry: request.entry,
        metadata: request.metadata,
        moduleId: request.manifest?.id,
      };
      plugins.set(id, descriptor);
      if (request.manifest) manifests.set(id, request.manifest);
      return descriptor;
    },

    activate(id) {
      const current = requirePlugin(id);
      const next: PluginDescriptor = { ...current, lifecycle: "activated" };
      plugins.set(current.id, next);
      return next;
    },

    deactivate(id) {
      const current = requirePlugin(id);
      const next: PluginDescriptor = { ...current, lifecycle: "deactivated" };
      plugins.set(current.id, next);
      return next;
    },

    uninstall(id) {
      const key = asPluginId(String(id));
      manifests.delete(key);
      return plugins.delete(key);
    },

    get(id) {
      return plugins.get(asPluginId(String(id)));
    },

    list(lifecycle) {
      const all = [...plugins.values()];
      return lifecycle ? all.filter((p) => p.lifecycle === lifecycle) : all;
    },

    getPendingManifest(id) {
      return manifests.get(asPluginId(String(id)));
    },
  };
}
