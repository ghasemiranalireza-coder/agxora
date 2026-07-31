import { backendConfig } from "../config";
import { getFeatureFlag } from "../config/featureFlags";
import { logPlatformEvent } from "../observability/logger";
import type { ApiFailure, ApiRequestOptions, ApiResponse } from "../types";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = "ApiClientError";
    this.status = failure.status;
    this.code = failure.code;
    this.details = failure.details;
  }
}

export type ApiRequestInterceptor = (
  options: ApiRequestOptions,
) => ApiRequestOptions | Promise<ApiRequestOptions>;

export type ApiResponseInterceptor = <T>(
  response: ApiResponse<T>,
  options: ApiRequestOptions,
) => ApiResponse<T> | Promise<ApiResponse<T>>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toFailure(status: number, body: unknown, fallback: string): ApiFailure {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    return {
      ok: false,
      status,
      code: String(record.code ?? `http_${status}`),
      message: String(record.message ?? fallback),
      details: record.details ?? body,
    };
  }
  return {
    ok: false,
    status,
    code: `http_${status}`,
    message: typeof body === "string" && body ? body : fallback,
  };
}

/**
 * Central API client — GET/POST/PUT/PATCH/DELETE, timeout, retry,
 * auth hooks, and future interceptors.
 */
export class ApiClient {
  private requestInterceptors: ApiRequestInterceptor[] = [];
  private responseInterceptors: ApiResponseInterceptor[] = [];
  private csrfToken: string | null = null;

  constructor(
    private readonly getToken: () => string | null | undefined = () => null,
    private readonly config = backendConfig,
  ) {}

  useRequestInterceptor(interceptor: ApiRequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter(
        (item) => item !== interceptor,
      );
    };
  }

  useResponseInterceptor(interceptor: ApiResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter(
        (item) => item !== interceptor,
      );
    };
  }

  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }

  get(path: string, options?: Omit<ApiRequestOptions, "method" | "path">) {
    return this.request({ ...options, method: "GET", path });
  }

  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "path" | "body">,
  ) {
    return this.request<T>({ ...options, method: "POST", path, body });
  }

  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "path" | "body">,
  ) {
    return this.request<T>({ ...options, method: "PUT", path, body });
  }

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "path" | "body">,
  ) {
    return this.request<T>({ ...options, method: "PATCH", path, body });
  }

  delete(path: string, options?: Omit<ApiRequestOptions, "method" | "path">) {
    return this.request({ ...options, method: "DELETE", path });
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    let prepared = options;
    for (const interceptor of this.requestInterceptors) {
      prepared = await interceptor(prepared);
    }

    const attempts = prepared.retry === false ? 1 : this.config.retryAttempts + 1;
    let lastFailure: ApiFailure | null = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        let result = await this.executeOnce<T>(prepared);
        for (const interceptor of this.responseInterceptors) {
          result = await interceptor(result, prepared);
        }
        if (result.ok) return result;
        lastFailure = result;
        const retryable = result.status >= 500 || result.status === 429;
        if (!retryable || attempt >= attempts - 1) {
          logPlatformEvent("api.error", {
            path: prepared.path,
            code: result.code,
            status: String(result.status),
          });
          return result;
        }
        await sleep(this.config.retryBackoffMs * (attempt + 1));
      } catch (error) {
        lastFailure = {
          ok: false,
          status: 0,
          code: "network_error",
          message: error instanceof Error ? error.message : "Network request failed",
        };
        if (attempt >= attempts - 1) {
          logPlatformEvent("api.error", {
            path: prepared.path,
            code: "network_error",
          });
          return lastFailure;
        }
        await sleep(this.config.retryBackoffMs * (attempt + 1));
      }
    }

    return (
      lastFailure ?? {
        ok: false,
        status: 0,
        code: "unknown",
        message: "Request failed",
      }
    );
  }

  async requestOrThrow<T>(options: ApiRequestOptions): Promise<T> {
    const result = await this.request<T>(options);
    if (!result.ok) throw new ApiClientError(result);
    return result.data;
  }

  private async executeOnce<T>(
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );
    const token = options.authToken ?? this.getToken();
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (getFeatureFlag("security.csrf") && this.csrfToken) {
      headers["X-AGXORA-CSRF"] = this.csrfToken;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}${options.path}`, {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal ?? controller.signal,
      });
      const body = await parseBody(response);
      if (!response.ok) {
        return toFailure(
          response.status,
          body,
          response.statusText || "Request failed",
        );
      }
      return { ok: true, data: body as T, status: response.status };
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}

let sharedClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!sharedClient) sharedClient = new ApiClient();
  return sharedClient;
}

export function configureApiClient(
  getToken: () => string | null | undefined,
): ApiClient {
  sharedClient = new ApiClient(getToken);
  return sharedClient;
}
