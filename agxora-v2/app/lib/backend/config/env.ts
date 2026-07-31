/**
 * Environment configuration — Development / Testing / Production.
 */

export type AppEnvironment = "development" | "test" | "production";

export interface BackendConfig {
  readonly env: AppEnvironment;
  readonly apiBaseUrl: string;
  readonly authRequired: boolean;
  readonly enableMockRepositories: boolean;
  readonly requestTimeoutMs: number;
  readonly retryAttempts: number;
  readonly retryBackoffMs: number;
  readonly enableAuditLog: boolean;
  readonly enableActivityFeed: boolean;
}

function resolveEnv(): AppEnvironment {
  const raw = process.env.NEXT_PUBLIC_AGXORA_ENV ?? process.env.NODE_ENV ?? "development";
  if (raw === "production") return "production";
  if (raw === "test") return "test";
  return "development";
}

export function createBackendConfig(
  overrides?: Partial<BackendConfig>,
): BackendConfig {
  const env = resolveEnv();
  const base: BackendConfig = {
    env,
    apiBaseUrl: process.env.NEXT_PUBLIC_AGXORA_API_BASE_URL ?? "/api",
    authRequired: process.env.AGXORA_AUTH_REQUIRED === "true",
    enableMockRepositories: env !== "production" || process.env.AGXORA_USE_MOCKS === "true",
    requestTimeoutMs: Number(process.env.AGXORA_REQUEST_TIMEOUT_MS ?? 15_000),
    retryAttempts: Number(process.env.AGXORA_RETRY_ATTEMPTS ?? 2),
    retryBackoffMs: Number(process.env.AGXORA_RETRY_BACKOFF_MS ?? 400),
    enableAuditLog: true,
    enableActivityFeed: true,
  };
  return { ...base, ...overrides };
}

export const backendConfig: BackendConfig = createBackendConfig();
