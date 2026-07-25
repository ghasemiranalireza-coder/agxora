/**
 * Global App Registry — installed applications discovered from modules.
 */

import type { AppId, ModuleId } from "../ids";
import type { AppDescriptor } from "../types";

export interface AppRegistry {
  register(app: AppDescriptor): void;
  unregister(id: AppId): boolean;
  get(id: AppId): AppDescriptor | undefined;
  list(): readonly AppDescriptor[];
  listEnabled(): readonly AppDescriptor[];
  listByModule(moduleId: ModuleId): readonly AppDescriptor[];
  setEnabled(id: AppId, enabled: boolean): void;
}

export function createAppRegistry(): AppRegistry {
  const apps = new Map<AppId, AppDescriptor>();

  return {
    register(app) {
      if (apps.has(app.id)) {
        throw new Error(`App already registered: ${app.id}`);
      }
      apps.set(app.id, { ...app });
    },

    unregister(id) {
      return apps.delete(id);
    },

    get(id) {
      return apps.get(id);
    },

    list() {
      return [...apps.values()];
    },

    listEnabled() {
      return [...apps.values()].filter((a) => a.enabled);
    },

    listByModule(moduleId) {
      return [...apps.values()].filter((a) => a.moduleId === moduleId);
    },

    setEnabled(id, enabled) {
      const current = apps.get(id);
      if (!current) throw new Error(`Unknown app: ${id}`);
      apps.set(id, { ...current, enabled });
    },
  };
}
