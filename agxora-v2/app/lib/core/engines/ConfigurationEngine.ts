/**
 * Configuration Engine — runtime / env / remote configuration surface.
 */

import type { ConfigKey } from "../ids";
import { asConfigKey } from "../ids";
import type { ConfigEntry } from "../types";

export interface ConfigurationEngine {
  get<T = unknown>(key: ConfigKey | string, fallback?: T): T | undefined;
  set(key: ConfigKey | string, value: unknown, source?: ConfigEntry["source"]): void;
  has(key: ConfigKey | string): boolean;
  list(): readonly ConfigEntry[];
  hydrate(entries: readonly ConfigEntry[]): void;
}

export function createConfigurationEngine(
  defaults: Record<string, unknown> = {},
): ConfigurationEngine {
  const entries = new Map<ConfigKey, ConfigEntry>();

  for (const [key, value] of Object.entries(defaults)) {
    const k = asConfigKey(key);
    entries.set(k, { key: k, value, source: "default" });
  }

  return {
    get(key, fallback) {
      const k = asConfigKey(String(key));
      const entry = entries.get(k);
      if (entry === undefined) return fallback;
      return entry.value as typeof fallback;
    },

    set(key, value, source = "runtime") {
      const k = asConfigKey(String(key));
      const existing = entries.get(k);
      if (existing?.readonly) {
        throw new Error(`Config key is readonly: ${key}`);
      }
      entries.set(k, { key: k, value, source, readonly: existing?.readonly });
    },

    has(key) {
      return entries.has(asConfigKey(String(key)));
    },

    list() {
      return [...entries.values()];
    },

    hydrate(incoming) {
      for (const entry of incoming) {
        entries.set(entry.key, entry);
      }
    },
  };
}
