/**
 * Integration observability — metrics for connectors, API, webhooks, sync.
 */

import type {
  ApiGatewayRequest,
  ApiKeyRecord,
  IntegrationConnection,
  IntegrationMetrics,
  SyncJob,
  WebhookDelivery,
} from "../types";
import { CONNECTOR_CATALOG } from "../connectors";

export function computeIntegrationMetrics(input: {
  readonly connections: readonly IntegrationConnection[];
  readonly apiRequests: readonly ApiGatewayRequest[];
  readonly deliveries: readonly WebhookDelivery[];
  readonly syncJobs: readonly SyncJob[];
  readonly apiKeys?: readonly ApiKeyRecord[];
}): IntegrationMetrics {
  void input.apiKeys;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const api24 = input.apiRequests.filter((r) => Date.parse(r.at) >= dayAgo);
  const wh24 = input.deliveries.filter((d) => Date.parse(d.createdAt) >= dayAgo);
  const sync24 = input.syncJobs.filter((s) => Date.parse(s.startedAt) >= dayAgo);

  return {
    connectedCount: input.connections.filter((c) => c.status === "connected")
      .length,
    availableCount: CONNECTOR_CATALOG.length,
    errorCount: input.connections.filter((c) => c.status === "error").length,
    apiRequests24h: api24.length,
    webhookDeliveries24h: wh24.length,
    webhookFailures24h: wh24.filter(
      (d) => d.status === "failed" || d.status === "retrying",
    ).length,
    syncJobs24h: sync24.length,
    syncConflicts24h: sync24.reduce((n, s) => n + s.conflicts, 0),
  };
}
