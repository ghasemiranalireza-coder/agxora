/**
 * MockDataProvider — emulates a real API for tests and demos.
 */

import type { ApiRequestOptions, ApiResponse } from "../../types";
import type {
  DataProvider,
  DataProviderCapabilities,
  DataProviderHealth,
} from "./types";
import { mockServer } from "../../mock/mockServer";

const CAPABILITIES: DataProviderCapabilities = {
  offline: true,
  realtime: false,
  transactions: false,
  search: true,
};

export class MockDataProvider implements DataProvider {
  readonly id = "mock" as const;
  readonly displayName = "Mock Data Provider";
  readonly capabilities = CAPABILITIES;

  async health(): Promise<DataProviderHealth> {
    return {
      ok: true,
      providerId: this.id,
      message: "Mock provider ready",
      checkedAt: new Date().toISOString(),
    };
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    return mockServer.handle<T>(options);
  }
}

export const mockDataProvider = new MockDataProvider();
