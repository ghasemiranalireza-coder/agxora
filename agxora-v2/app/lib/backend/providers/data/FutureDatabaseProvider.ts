/**
 * FutureDatabaseProvider — ORM / SQL / document DB placeholder.
 */

import type { ApiFailure, ApiRequestOptions, ApiResponse } from "../../types";
import type {
  DataProvider,
  DataProviderCapabilities,
  DataProviderHealth,
} from "./types";

const CAPABILITIES: DataProviderCapabilities = {
  offline: false,
  realtime: false,
  transactions: true,
  search: true,
};

export class FutureDatabaseProvider implements DataProvider {
  readonly id = "database" as const;
  readonly displayName = "Future Database Provider";
  readonly capabilities = CAPABILITIES;

  async health(): Promise<DataProviderHealth> {
    return {
      ok: false,
      providerId: this.id,
      message:
        "Database provider placeholder — Prisma/Drizzle/Postgres adapters plug in here",
      checkedAt: new Date().toISOString(),
    };
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    void options;
    const failure: ApiFailure = {
      ok: false,
      status: 501,
      code: "database_not_implemented",
      message:
        "FutureDatabaseProvider is architecture-only. Connect an ORM adapter without changing UI.",
    };
    return failure;
  }
}

export const futureDatabaseProvider = new FutureDatabaseProvider();
