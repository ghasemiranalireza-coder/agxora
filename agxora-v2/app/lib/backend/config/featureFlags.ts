/**
 * Feature flags + platform configuration.
 */

import { backendConfig, type BackendConfig } from "../config/env";

export type FeatureFlagKey =
  | "data.rest"
  | "data.graphql"
  | "data.database"
  | "cache.swr"
  | "observability.metrics"
  | "security.csrf"
  | "security.httpOnlyCookies"
  | "loading.optimistic"
  | "mock.server";

export interface FeatureFlags {
  readonly [key: string]: boolean;
}

const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  "data.rest": true,
  "data.graphql": false,
  "data.database": false,
  "cache.swr": true,
  "observability.metrics": true,
  "security.csrf": false,
  "security.httpOnlyCookies": false,
  "loading.optimistic": true,
  "mock.server": backendConfig.enableMockRepositories,
};

let flags: Record<string, boolean> = { ...DEFAULT_FLAGS };

export function getFeatureFlag(key: FeatureFlagKey | string): boolean {
  return Boolean(flags[key]);
}

export function setFeatureFlag(key: string, value: boolean): void {
  flags = { ...flags, [key]: value };
}

export function listFeatureFlags(): Readonly<Record<string, boolean>> {
  return flags;
}

export function resetFeatureFlags(): void {
  flags = { ...DEFAULT_FLAGS };
}

export interface PlatformConfig extends BackendConfig {
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly dataProvider: "local" | "rest" | "graphql" | "database" | "mock";
  readonly csrfHeaderName: string;
  readonly jwtStorageKey: string;
}

export function getPlatformConfig(): PlatformConfig {
  const dataProviderEnv = process.env.NEXT_PUBLIC_AGXORA_DATA_PROVIDER;
  const dataProvider =
    dataProviderEnv === "rest" ||
    dataProviderEnv === "graphql" ||
    dataProviderEnv === "database" ||
    dataProviderEnv === "mock" ||
    dataProviderEnv === "local"
      ? dataProviderEnv
      : backendConfig.enableMockRepositories
        ? "local"
        : "rest";

  return {
    ...backendConfig,
    featureFlags: listFeatureFlags(),
    dataProvider,
    csrfHeaderName: "X-AGXORA-CSRF",
    jwtStorageKey: "agxora.secure.tokens",
  };
}
