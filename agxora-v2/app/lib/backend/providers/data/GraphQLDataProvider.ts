/**
 * GraphQLProvider — architecture placeholder.
 * Register a real GraphQL client later without changing repositories.
 */

import type { ApiFailure, ApiRequestOptions, ApiResponse } from "../../types";
import type {
  DataProvider,
  DataProviderCapabilities,
  DataProviderHealth,
} from "./types";

const CAPABILITIES: DataProviderCapabilities = {
  offline: false,
  realtime: true,
  transactions: false,
  search: true,
};

export class GraphQLDataProvider implements DataProvider {
  readonly id = "graphql" as const;
  readonly displayName = "GraphQL Data Provider";
  readonly capabilities = CAPABILITIES;

  async health(): Promise<DataProviderHealth> {
    return {
      ok: false,
      providerId: this.id,
      message: "GraphQL provider is a placeholder — wire Apollo/urql later",
      checkedAt: new Date().toISOString(),
    };
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    void options;
    const failure: ApiFailure = {
      ok: false,
      status: 501,
      code: "graphql_not_implemented",
      message:
        "GraphQLDataProvider is architecture-only. Implement execute(query, variables) in a later phase.",
    };
    return failure;
  }
}

export const graphQLDataProvider = new GraphQLDataProvider();
