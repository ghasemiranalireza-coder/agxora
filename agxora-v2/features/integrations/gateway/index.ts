/**
 * Centralized API Gateway — REST now; GraphQL / WebSocket / gRPC placeholders.
 *
 * REST calls hit real same-origin `/api` Route Handlers.
 * Failures (including TypeError: Failed to fetch) are returned in the result
 * body — never silently simulated as 200.
 */

import type { ApiGatewayRequest, ApiGatewayRoute, ApiProtocol } from "../types";

export const DEFAULT_GATEWAY_ROUTES: readonly ApiGatewayRoute[] = [
  {
    id: "route_rest_v1",
    method: "*",
    path: "/api/v1/*",
    protocol: "rest",
    description: "Primary REST API surface",
    enabled: true,
  },
  {
    id: "route_webhooks",
    method: "POST",
    path: "/api/v1/webhooks/:id",
    protocol: "webhook",
    description: "Incoming webhook receiver",
    enabled: true,
  },
  {
    id: "route_graphql",
    method: "POST",
    path: "/api/v1/graphql",
    protocol: "graphql",
    description: "GraphQL endpoint (placeholder)",
    enabled: false,
  },
  {
    id: "route_ws",
    method: "GET",
    path: "/api/v1/ws",
    protocol: "websocket",
    description: "WebSocket upgrade (placeholder)",
    enabled: false,
  },
  {
    id: "route_grpc",
    method: "*",
    path: "/api/v1/grpc",
    protocol: "grpc",
    description: "Future gRPC gateway (placeholder)",
    enabled: false,
  },
] as const;

export interface GatewayHandlerResult {
  readonly statusCode: number;
  readonly body: Readonly<Record<string, unknown>>;
  readonly durationMs: number;
}

export type GatewayHandler = (input: {
  readonly method: string;
  readonly path: string;
  readonly protocol: ApiProtocol;
  readonly organizationId: string;
  readonly apiKeyId?: string;
  readonly body?: Readonly<Record<string, unknown>>;
}) => Promise<GatewayHandlerResult> | GatewayHandlerResult;

let customHandler: GatewayHandler | null = null;

export function setApiGatewayHandler(handler: GatewayHandler): void {
  customHandler = handler;
}

function resolveFetchUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  return `/api/v1/${path.replace(/^\//, "")}`;
}

async function executeRestFetch(input: {
  readonly method: string;
  readonly path: string;
  readonly body?: Readonly<Record<string, unknown>>;
}): Promise<GatewayHandlerResult> {
  const started = Date.now();
  const url = resolveFetchUrl(input.path);
  try {
    const response = await fetch(url, {
      method: input.method || "GET",
      headers: {
        Accept: "application/json",
        ...(input.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        input.body !== undefined ? JSON.stringify(input.body) : undefined,
    });
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = {
          ok: false,
          code: "non_json_response",
          message: `Upstream returned non-JSON (HTTP ${response.status})`,
          preview: text.slice(0, 240),
        };
      }
    }
    const body: Record<string, unknown> =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { data: parsed };

    return {
      statusCode: response.status,
      body,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    // Preserve the underlying browser/Node message (e.g. "Failed to fetch").
    const message =
      error instanceof Error ? error.message : "Network request failed";
    return {
      statusCode: 0,
      body: {
        ok: false,
        code: "network_error",
        message,
        name: error instanceof Error ? error.name : "Error",
        url,
      },
      durationMs: Date.now() - started,
    };
  }
}

export async function invokeApiGateway(input: {
  readonly organizationId: string;
  readonly method: string;
  readonly path: string;
  readonly protocol?: ApiProtocol;
  readonly apiKeyId?: string;
  readonly body?: Readonly<Record<string, unknown>>;
}): Promise<{ result: GatewayHandlerResult; request: Omit<ApiGatewayRequest, "id"> }> {
  const started = Date.now();
  const protocol = input.protocol ?? "rest";
  const route =
    DEFAULT_GATEWAY_ROUTES.find(
      (r) => r.protocol === protocol && r.enabled,
    ) ?? DEFAULT_GATEWAY_ROUTES[0];

  let result: GatewayHandlerResult;

  if (customHandler) {
    result = await customHandler({
      method: input.method,
      path: input.path,
      protocol,
      organizationId: input.organizationId,
      apiKeyId: input.apiKeyId,
      body: input.body,
    });
  } else if (protocol === "rest") {
    result = await executeRestFetch({
      method: input.method,
      path: input.path,
      body: input.body,
    });
  } else {
    result = {
      statusCode: 501,
      body: {
        ok: false,
        code: "protocol_not_implemented",
        message: `Gateway protocol "${protocol}" is not enabled yet`,
        path: input.path,
      },
      durationMs: Date.now() - started,
    };
  }

  return {
    result,
    request: {
      organizationId: input.organizationId,
      routeId: route.id,
      method: input.method,
      path: input.path,
      statusCode: result.statusCode,
      durationMs: result.durationMs || Date.now() - started,
      at: new Date().toISOString(),
      apiKeyId: input.apiKeyId,
    },
  };
}
