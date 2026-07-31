/**
 * Data provider contracts — UI stays provider-independent.
 */

import type { ApiRequestOptions, ApiResponse } from "../../types";

export type DataProviderId =
  | "local"
  | "rest"
  | "graphql"
  | "database"
  | "mock";

export interface DataProviderCapabilities {
  readonly offline: boolean;
  readonly realtime: boolean;
  readonly transactions: boolean;
  readonly search: boolean;
}

export interface DataProviderHealth {
  readonly ok: boolean;
  readonly providerId: DataProviderId;
  readonly message: string;
  readonly checkedAt: string;
}

/**
 * Transport-level data provider.
 * Repositories call this — never localStorage or fetch from UI.
 */
export interface DataProvider {
  readonly id: DataProviderId;
  readonly displayName: string;
  readonly capabilities: DataProviderCapabilities;

  health(): Promise<DataProviderHealth>;

  /**
   * Generic resource request — path is logical (`/crm/customers`),
   * provider maps to LocalStorage / REST / GraphQL / DB.
   */
  request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>>;
}

export type DataProviderFactory = () => DataProvider;
