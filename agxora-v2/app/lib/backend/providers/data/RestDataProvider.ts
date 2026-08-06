/**
 * RESTProvider — delegates to the centralized ApiClient.
 */

import { getApiClient } from "../../api/client";
import type { ApiRequestOptions, ApiResponse } from "../../types";
import type {
  DataProvider,
  DataProviderCapabilities,
  DataProviderHealth,
} from "./types";

const CAPABILITIES: DataProviderCapabilities = {
  offline: false,
  realtime: false,
  transactions: false,
  search: true,
};

export class RestDataProvider implements DataProvider {
  readonly id = "rest" as const;
  readonly displayName = "REST Data Provider";
  readonly capabilities = CAPABILITIES;

  async health(): Promise<DataProviderHealth> {
    const client = getApiClient();
    // Prefer versioned health; fall back to /health (both are implemented).
    const result = await client.request<{ readonly status?: string }>({
      method: "GET",
      path: "/v1/health",
      retry: false,
    });
    const fallback =
      result.ok
        ? result
        : await client.request<{ readonly status?: string }>({
            method: "GET",
            path: "/health",
            retry: false,
          });
    const finalResult = result.ok ? result : fallback;
    return {
      ok: finalResult.ok,
      providerId: this.id,
      message: finalResult.ok
        ? "REST provider reachable"
        : `REST health failed: ${finalResult.message}`,
      checkedAt: new Date().toISOString(),
    };
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    return getApiClient().request<T>(options);
  }
}

export const restDataProvider = new RestDataProvider();
