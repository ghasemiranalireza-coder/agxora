/**
 * Extension Engine — contribution points for future extendability.
 */

import type { ExtensionId, ModuleId } from "../ids";
import type { ExtensionContribution, ExtensionPoint } from "../types";

export interface ExtensionEngine {
  contribute(contribution: ExtensionContribution): void;
  remove(id: ExtensionId): boolean;
  removeByModule(moduleId: ModuleId): void;
  list(point?: ExtensionPoint): readonly ExtensionContribution[];
  listEnabled(point?: ExtensionPoint): readonly ExtensionContribution[];
  setEnabled(id: ExtensionId, enabled: boolean): void;
}

export function createExtensionEngine(): ExtensionEngine {
  const contributions = new Map<ExtensionId, ExtensionContribution>();

  return {
    contribute(contribution) {
      contributions.set(contribution.id, { ...contribution });
    },

    remove(id) {
      return contributions.delete(id);
    },

    removeByModule(moduleId) {
      for (const [id, c] of [...contributions]) {
        if (c.moduleId === moduleId) contributions.delete(id);
      }
    },

    list(point) {
      const all = [...contributions.values()];
      return point ? all.filter((c) => c.point === point) : all;
    },

    listEnabled(point) {
      return this.list(point).filter((c) => c.enabled);
    },

    setEnabled(id, enabled) {
      const current = contributions.get(id);
      if (!current) throw new Error(`Unknown extension: ${id}`);
      contributions.set(id, { ...current, enabled });
    },
  };
}
