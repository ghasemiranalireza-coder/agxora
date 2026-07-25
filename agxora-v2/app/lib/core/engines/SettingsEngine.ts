/**
 * Settings Engine — scoped settings for user / workspace / organization / system.
 */

import type { SettingKey } from "../ids";
import type { ModuleSettingDefinition, SettingScope, SettingValue } from "../types";

function scopeKey(scope: SettingScope, scopeId: string, key: SettingKey): string {
  return `${scope}:${scopeId}:${key}`;
}

export interface SettingsEngine {
  define(definitions: readonly ModuleSettingDefinition[]): void;
  getDefinitions(): readonly ModuleSettingDefinition[];
  get(key: SettingKey, scope: SettingScope, scopeId: string): unknown;
  set(key: SettingKey, scope: SettingScope, scopeId: string, value: unknown): SettingValue;
  list(scope: SettingScope, scopeId: string): readonly SettingValue[];
  reset(key: SettingKey, scope: SettingScope, scopeId: string): void;
}

export function createSettingsEngine(): SettingsEngine {
  const definitions = new Map<SettingKey, ModuleSettingDefinition>();
  const values = new Map<string, SettingValue>();

  return {
    define(defs) {
      for (const def of defs) {
        definitions.set(def.key, def);
      }
    },

    getDefinitions() {
      return [...definitions.values()];
    },

    get(key, scope, scopeId) {
      const stored = values.get(scopeKey(scope, scopeId, key));
      if (stored !== undefined) return stored.value;
      return definitions.get(key)?.defaultValue;
    },

    set(key, scope, scopeId, value) {
      const record: SettingValue = {
        key,
        scope,
        scopeId,
        value,
        updatedAt: new Date().toISOString(),
      };
      values.set(scopeKey(scope, scopeId, key), record);
      return record;
    },

    list(scope, scopeId) {
      const prefix = `${scope}:${scopeId}:`;
      return [...values.values()].filter((v) =>
        scopeKey(v.scope, v.scopeId, v.key).startsWith(prefix),
      );
    },

    reset(key, scope, scopeId) {
      values.delete(scopeKey(scope, scopeId, key));
    },
  };
}
