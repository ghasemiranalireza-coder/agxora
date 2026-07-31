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
    const result = await client.request<{ readonly status?: string }>({
      method: "GET",
      path: "/health",
      retry: false,
    });
    return {
      ok: result.ok,
      providerId: this.id,
      message: result.ok
        ? "REST provider reachable"
        : `REST health failed: ${result.message}`,
      checkedAt: new Date().toISOString(),
    };
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    return getApiClient().request<T>(options);
  }
}

export const restDataProvider = new RestDataProvider();
