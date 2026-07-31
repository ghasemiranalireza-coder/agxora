/**
 * Centralized API Gateway — REST now; GraphQL / WebSocket / gRPC placeholders.
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

  const result = customHandler
    ? await customHandler({
        method: input.method,
        path: input.path,
        protocol,
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId,
        body: input.body,
      })
    : {
        statusCode: 200,
        body: {
          ok: true,
          simulated: true,
          path: input.path,
          method: input.method,
          protocol,
        },
        durationMs: Date.now() - started,
      };

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
