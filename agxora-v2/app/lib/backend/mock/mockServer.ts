/**
 * Mock backend server — emulates REST responses for local/testing.
 * Register handlers; UI never hardcodes payload shapes.
 */

import type { ApiFailure, ApiRequestOptions, ApiResponse } from "../types";

export type MockHandler = (
  options: ApiRequestOptions,
) => Promise<ApiResponse<unknown>> | ApiResponse<unknown>;

function ok<T>(data: T, status = 200): ApiResponse<T> {
  return { ok: true, data, status };
}

function fail(
  status: number,
  code: string,
  message: string,
): ApiFailure {
  return { ok: false, status, code, message };
}

class MockServer {
  private readonly routes = new Map<string, MockHandler>();
  private latencyMs = 40;

  setLatency(ms: number): void {
    this.latencyMs = Math.max(0, ms);
  }

  register(
    method: ApiRequestOptions["method"],
    path: string,
    handler: MockHandler,
  ): void {
    this.routes.set(routeKey(method ?? "GET", path), handler);
  }

  async handle<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs));
    }
    const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
    const key = routeKey(method, stripQuery(options.path));
    const handler = this.routes.get(key);
    if (!handler) {
      return fail(
        404,
        "mock_not_found",
        `Mock route not found: ${method} ${options.path}`,
      ) as ApiResponse<T>;
    }
    const result = await handler(options);
    return result as ApiResponse<T>;
  }

  /** Seed default enterprise mock endpoints. */
  bootstrapDefaults(): void {
    this.register("GET", "/health", () =>
      ok({ status: "ok", provider: "mock", at: new Date().toISOString() }),
    );
    this.register("GET", "/crm/customers", () =>
      ok({ items: [], total: 0, page: 1, pageSize: 25 }),
    );
    this.register("GET", "/projects", () =>
      ok({ items: [], total: 0, page: 1, pageSize: 25 }),
    );
    this.register("GET", "/finance/invoices", () =>
      ok({ items: [], total: 0, page: 1, pageSize: 25 }),
    );
    this.register("GET", "/documents", () =>
      ok({ items: [], total: 0, page: 1, pageSize: 25 }),
    );
    this.register("GET", "/ai/conversations", () =>
      ok({ items: [], total: 0, page: 1, pageSize: 25 }),
    );
    this.register("GET", "/identity/me", () =>
      ok({
        id: "user_mock",
        email: "demo@agxora.local",
        displayName: "Demo User",
        emailVerified: true,
      }),
    );
  }
}

function routeKey(method: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${method.toUpperCase()} ${normalized}`;
}

function stripQuery(path: string): string {
  const idx = path.indexOf("?");
  return idx >= 0 ? path.slice(0, idx) : path;
}

export const mockServer = new MockServer();
mockServer.bootstrapDefaults();

export { ok as mockOk, fail as mockFail };
