/**
 * Feature Flag System — gated rollout without redesigning modules.
 */

import type { FeatureFlagKey } from "../ids";
import { asFeatureFlagKey } from "../ids";
import type { FeatureFlag } from "../types";

export interface FeatureFlagEngine {
  define(flag: FeatureFlag): void;
  isEnabled(
    key: FeatureFlagKey | string,
    context?: { workspaceId?: string; organizationId?: string },
  ): boolean;
  setEnabled(key: FeatureFlagKey | string, enabled: boolean): void;
  list(): readonly FeatureFlag[];
  get(key: FeatureFlagKey | string): FeatureFlag | undefined;
}

export function createFeatureFlagEngine(
  initial: readonly FeatureFlag[] = [],
): FeatureFlagEngine {
  const flags = new Map<FeatureFlagKey, FeatureFlag>();

  for (const flag of initial) {
    flags.set(flag.key, flag);
  }

  return {
    define(flag) {
      flags.set(flag.key, { ...flag });
    },

    get(key) {
      return flags.get(asFeatureFlagKey(String(key)));
    },

    list() {
      return [...flags.values()];
    },

    setEnabled(key, enabled) {
      const k = asFeatureFlagKey(String(key));
      const current = flags.get(k);
      if (!current) {
        flags.set(k, { key: k, enabled });
        return;
      }
      flags.set(k, { ...current, enabled });
    },

    isEnabled(key, context) {
      const flag = flags.get(asFeatureFlagKey(String(key)));
      if (!flag) return false;
      if (!flag.enabled) return false;

      if (context?.workspaceId && flag.workspaceIds?.length) {
        if (!flag.workspaceIds.includes(context.workspaceId)) return false;
      }
      if (context?.organizationId && flag.organizationIds?.length) {
        if (!flag.organizationIds.includes(context.organizationId)) return false;
      }

      if (
        typeof flag.rolloutPercent === "number" &&
        flag.rolloutPercent < 100
      ) {
        const seed = `${key}:${context?.workspaceId ?? context?.organizationId ?? "global"}`;
        let hash = 0;
        for (let i = 0; i < seed.length; i += 1) {
          hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
        }
        return hash % 100 < flag.rolloutPercent;
      }

      return true;
    },
  };
}
