/**
 * Environment configuration — production separation & fail-closed assertions.
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
  readonly crmPersistence: string;
  readonly authMode: string;
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

/** True when this process must fail closed (production env or NODE_ENV). */
export function isProductionRuntime(): boolean {
  if (resolveRuntimeEnv() === "production") return true;
  return process.env.NODE_ENV === "production";
}

/**
 * Private-route hard gate.
 * Production always requires auth (fail closed), even if AGXORA_AUTH_REQUIRED=false.
 */
export function isAuthRequired(): boolean {
  if (isProductionRuntime()) return true;
  return process.env.AGXORA_AUTH_REQUIRED === "true";
}

function readCrmPersistence(): string {
  return (
    process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE || "local"
  )
    .trim()
    .toLowerCase();
}

function readAuthMode(): string {
  return (process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE || "")
    .trim()
    .toLowerCase();
}

function readDataProvider(): string {
  return (
    process.env.NEXT_PUBLIC_AGXORA_DATA_PROVIDER ?? "local"
  )
    .trim()
    .toLowerCase();
}

export function getEnvSnapshot(): AgxoraEnvSnapshot {
  return {
    runtime: resolveRuntimeEnv(),
    authRequired: isAuthRequired(),
    useMocks: process.env.AGXORA_USE_MOCKS !== "false",
    apiBaseUrl: process.env.NEXT_PUBLIC_AGXORA_API_BASE_URL ?? "/api",
    dataProvider: readDataProvider() || "local",
    crmPersistence: readCrmPersistence() || "local",
    authMode: readAuthMode() || "server",
    nodeEnv: process.env.NODE_ENV ?? "development",
    appVersion: process.env.NEXT_PUBLIC_AGXORA_VERSION ?? "0.39.0",
  };
}

export function isRemoteDataProvider(provider: string): boolean {
  return provider === "rest" || provider === "remote" || provider === "api";
}

/**
 * Production email is ready only with the HTTP worker provider + URL.
 * `none` / `memory` / `console` are not production delivery.
 */
export function isProductionEmailConfigured(): boolean {
  const provider = (process.env.AGXORA_EMAIL_PROVIDER || "none")
    .trim()
    .toLowerCase();
  const url = process.env.AGXORA_EMAIL_HTTP_URL?.trim();
  return provider === "http" && Boolean(url);
}

/**
 * Fail-closed production assertions.
 * Used by readiness (HTTP 503) and instrumentation logs — never throws on Edge.
 */
export function assertProdEnv(): readonly string[] {
  if (!isProductionRuntime()) return [];

  const env = getEnvSnapshot();
  const warnings: string[] = [];

  if (process.env.AGXORA_AUTH_REQUIRED === "false") {
    warnings.push(
      "AGXORA_AUTH_REQUIRED=false is ignored in production (auth is required)",
    );
  }
  if (env.authMode === "local") {
    warnings.push(
      "NEXT_PUBLIC_AGXORA_AUTH_MODE=local is not allowed in production (forced server)",
    );
  }
  if (env.useMocks) {
    warnings.push("AGXORA_USE_MOCKS should be false in production");
  }
  if (env.crmPersistence !== "database") {
    warnings.push(
      "NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE must be database in production",
    );
  }
  if (!isRemoteDataProvider(env.dataProvider)) {
    warnings.push(
      "NEXT_PUBLIC_AGXORA_DATA_PROVIDER should use rest/remote in production",
    );
  }
  if (!isProductionEmailConfigured()) {
    warnings.push(
      "Production requires AGXORA_EMAIL_PROVIDER=http and AGXORA_EMAIL_HTTP_URL",
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
  if (!process.env.DATABASE_URL?.trim()) {
    warnings.push("DATABASE_URL must be set in production");
  }
  return warnings;
}
