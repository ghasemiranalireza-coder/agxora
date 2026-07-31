/**
 * LocalDataProvider — maps logical API paths to in-process handlers.
 * Backs development / offline while repositories migrate off raw LocalStorage.
 */

import type { ApiFailure, ApiRequestOptions, ApiResponse } from "../../types";
import type {
  DataProvider,
  DataProviderCapabilities,
  DataProviderHealth,
} from "./types";

export type LocalHandler = (
  options: ApiRequestOptions,
) => Promise<ApiResponse<unknown>> | ApiResponse<unknown>;

const CAPABILITIES: DataProviderCapabilities = {
  offline: true,
  realtime: false,
  transactions: false,
  search: true,
};

export class LocalDataProvider implements DataProvider {
  readonly id = "local" as const;
  readonly displayName = "Local Data Provider";
  readonly capabilities = CAPABILITIES;

  private readonly handlers = new Map<string, LocalHandler>();

  register(pathPattern: string, handler: LocalHandler): void {
    this.handlers.set(normalizePath(pathPattern), handler);
  }

  async health(): Promise<DataProviderHealth> {
    return {
      ok: true,
      providerId: this.id,
      message: "Local provider ready (in-process / LocalStorage-backed handlers)",
      checkedAt: new Date().toISOString(),
    };
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const path = normalizePath(options.path);
    const handler =
      this.handlers.get(path) ??
      this.handlers.get(stripQuery(path)) ??
      findPrefixHandler(this.handlers, stripQuery(path));

    if (!handler) {
      const failure: ApiFailure = {
        ok: false,
        status: 404,
        code: "local_handler_missing",
        message: `No local handler for ${options.path}`,
      };
      return failure;
    }

    const result = await handler(options);
    return result as ApiResponse<T>;
  }
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

function stripQuery(path: string): string {
  const idx = path.indexOf("?");
  return idx >= 0 ? path.slice(0, idx) : path;
}

function findPrefixHandler(
  handlers: Map<string, LocalHandler>,
  path: string,
): LocalHandler | undefined {
  let best: { key: string; handler: LocalHandler } | undefined;
  for (const [key, handler] of handlers) {
    if (path === key || path.startsWith(`${key}/`)) {
      if (!best || key.length > best.key.length) {
        best = { key, handler };
      }
    }
  }
  return best?.handler;
}

export const localDataProvider = new LocalDataProvider();
