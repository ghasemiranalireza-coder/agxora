/**
 * Future API Layer — transport-agnostic port for modules.
 *
 * Local stub adapter for development. Real HTTP/gRPC adapters plug in later.
 */

import type { ApiPort, ApiRequest, ApiResponse } from "../types";

export interface ApiLayer extends ApiPort {
  use(adapter: ApiPort): void;
  getAdapterName(): string;
}

class LocalStubAdapter implements ApiPort {
  async request<TData = unknown, TBody = unknown>(
    req: ApiRequest<TBody>,
  ): Promise<ApiResponse<TData>> {
    return {
      ok: false,
      status: 501,
      error: {
        code: "API_NOT_CONNECTED",
        message: `Future API layer stub — no backend for ${req.method} ${req.path}`,
        details: {
          workspaceId: req.workspaceId,
          organizationId: req.organizationId,
        },
      },
    };
  }
}

export function createApiLayer(adapter: ApiPort = new LocalStubAdapter()): ApiLayer {
  let current = adapter;
  let name = adapter.constructor.name || "ApiPort";

  return {
    use(next) {
      current = next;
      name = next.constructor.name || "ApiPort";
    },

    getAdapterName() {
      return name;
    },

    request(req) {
      return current.request(req);
    },
  };
}
