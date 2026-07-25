/**
 * Module Registry — every capability registers itself here.
 */

import type { ModuleId } from "../ids";
import type { ModuleManifest, ModuleStatus } from "../types";

export interface ModuleRegistry {
  register(manifest: ModuleManifest): void;
  unregister(id: ModuleId): boolean;
  get(id: ModuleId): ModuleManifest | undefined;
  has(id: ModuleId): boolean;
  list(): readonly ModuleManifest[];
  listByStatus(status: ModuleStatus): readonly ModuleManifest[];
  setStatus(id: ModuleId, status: ModuleStatus): void;
  activate(id: ModuleId): void;
  deactivate(id: ModuleId): void;
}

export function createModuleRegistry(): ModuleRegistry {
  const modules = new Map<ModuleId, ModuleManifest>();

  return {
    register(manifest) {
      if (modules.has(manifest.id)) {
        throw new Error(`Module already registered: ${manifest.id}`);
      }
      modules.set(manifest.id, { ...manifest });
    },

    unregister(id) {
      return modules.delete(id);
    },

    get(id) {
      return modules.get(id);
    },

    has(id) {
      return modules.has(id);
    },

    list() {
      return [...modules.values()];
    },

    listByStatus(status) {
      return [...modules.values()].filter((m) => m.status === status);
    },

    setStatus(id, status) {
      const current = modules.get(id);
      if (!current) throw new Error(`Unknown module: ${id}`);
      modules.set(id, { ...current, status });
    },

    activate(id) {
      this.setStatus(id, "active");
    },

    deactivate(id) {
      this.setStatus(id, "inactive");
    },
  };
}
