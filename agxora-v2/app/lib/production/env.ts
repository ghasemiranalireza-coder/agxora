/**
 * Environment configuration — production separation & assertions.
 */

export type AgxoraRuntimeEnv =
  | "development"
  | "test"
  | "staging"
  | "production";

export interface AgxoraEnvSnapshot {
  readonly runtime: AgxoraRuntimeEnv;
  readonly authRequired: boolean;
  readonly useMocks: boolean;
  readonly apiBaseUrl: string;
  readonly dataProvider: string;
  readonly nodeEnv: string;
  readonly appVersion: string;
}

export function resolveRuntimeEnv(): AgxoraRuntimeEnv {
  const raw = (
    process.env.NEXT_PUBLIC_AGXORA_ENV ??
    process.env.NODE_ENV ??
    "development"
  ).toLowerCase();
  if (
    raw === "production" ||
    raw === "staging" ||
    raw === "test" ||
    raw === "development"
  ) {
    return raw;
  }
  return "development";
}

export function getEnvSnapshot(): AgxoraEnvSnapshot {
  return {
    runtime: resolveRuntimeEnv(),
    authRequired: process.env.AGXORA_AUTH_REQUIRED === "true",
    useMocks: process.env.AGXORA_USE_MOCKS !== "false",
    apiBaseUrl: process.env.NEXT_PUBLIC_AGXORA_API_BASE_URL ?? "/api",
    dataProvider: process.env.NEXT_PUBLIC_AGXORA_DATA_PROVIDER ?? "local",
    nodeEnv: process.env.NODE_ENV ?? "development",
    appVersion: process.env.NEXT_PUBLIC_AGXORA_VERSION ?? "0.37.0",
  };
}

/**
 * Soft production assertions — log warnings; never throw in edge paths.
 * Call from instrumentation / health for ops visibility.
 */
export function assertProdEnv(): readonly string[] {
  const env = getEnvSnapshot();
  const warnings: string[] = [];
  if (env.runtime === "production" || env.nodeEnv === "production") {
    if (!env.authRequired) {
      warnings.push("AGXORA_AUTH_REQUIRED should be true in production");
    }
    if (env.useMocks) {
      warnings.push("AGXORA_USE_MOCKS should be false in production");
    }
    if (env.dataProvider === "local" || env.dataProvider === "mock") {
      warnings.push(
        "NEXT_PUBLIC_AGXORA_DATA_PROVIDER should use a remote provider in production",
      );
    }
    const siteUrl = process.env.NEXT_PUBLIC_AGXORA_SITE_URL;
    if (!siteUrl || !/^https:\/\//i.test(siteUrl)) {
      warnings.push(
        "NEXT_PUBLIC_AGXORA_SITE_URL should be an https URL in production",
      );
    }
    if (!process.env.NEXT_PUBLIC_AGXORA_VERSION) {
      warnings.push("NEXT_PUBLIC_AGXORA_VERSION should be set in production");
    }
  }
  return warnings;
}
