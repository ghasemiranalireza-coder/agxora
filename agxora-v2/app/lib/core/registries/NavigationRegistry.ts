/**
 * Navigation Registry — module-contributed navigation, centrally resolved.
 *
 * Does not render UI. Consumers (sidebar, etc.) read from this registry.
 */

import type { ModuleId, NavItemId } from "../ids";
import type { ModuleNavigationDefinition, NavigationEntry } from "../types";

export interface NavigationRegistry {
  register(moduleId: ModuleId, items: readonly ModuleNavigationDefinition[]): void;
  unregisterModule(moduleId: ModuleId): void;
  get(id: NavItemId): NavigationEntry | undefined;
  list(): readonly NavigationEntry[];
  listVisible(): readonly NavigationEntry[];
  setVisible(id: NavItemId, visible: boolean): void;
  clear(): void;
}

export function createNavigationRegistry(): NavigationRegistry {
  const entries = new Map<NavItemId, NavigationEntry>();

  return {
    register(moduleId, items) {
      for (const item of items) {
        entries.set(item.id, {
          ...item,
          moduleId,
          visible: true,
        });
      }
    },

    unregisterModule(moduleId) {
      for (const [id, entry] of [...entries]) {
        if (entry.moduleId === moduleId) entries.delete(id);
      }
    },

    get(id) {
      return entries.get(id);
    },

    list() {
      return [...entries.values()].sort(
        (a, b) => (a.order ?? 1000) - (b.order ?? 1000),
      );
    },

    listVisible() {
      return this.list().filter((e) => e.visible);
    },

    setVisible(id, visible) {
      const current = entries.get(id);
      if (!current) throw new Error(`Unknown nav item: ${id}`);
      entries.set(id, { ...current, visible });
    },

    clear() {
      entries.clear();
    },
  };
}
