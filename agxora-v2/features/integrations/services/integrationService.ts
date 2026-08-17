/**
 * Integration platform service — orchestration without UI coupling.
 */

import { CONNECTOR_CATALOG, getConnectorDefinition, getConnectorProvider } from "../connectors";
import { beginOAuth } from "../oauth";
import { invokeApiGateway, DEFAULT_GATEWAY_ROUTES } from "../gateway";
import {
  createWebhookSecretRef,
  deliverOutgoingWebhook,
  receiveIncomingWebhook,
} from "../webhooks";
import {
  createApiKey,
  isApiKeyExpired,
  markApiKeyUsed,
  revokeApiKey,
  rotateApiKey,
} from "../api-keys";
import { runSyncJob } from "../sync";
import { getSecretVault } from "../security";
import { publishIntegrationEvent } from "../event-bridge";
import { integrationsStore } from "../store";
import type {
  ApiGatewayRequest,
  ApiKeyRecord,
  ConnectorId,
  DeveloperSettings,
  IntegrationConnection,
  IntegrationLogEntry,
  SyncMode,
  WebhookEndpoint,
} from "../types";
import { DEFAULT_DEVELOPER_SETTINGS } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function log(
  organizationId: string,
  level: IntegrationLogEntry["level"],
  source: string,
  message: string,
  extra?: Partial<IntegrationLogEntry>,
): void {
  integrationsStore.pushLog({
    id: createId("ilog"),
    organizationId,
    level,
    source,
    message,
    at: nowIso(),
    ...extra,
  });
}

export const integrationService = {
  ensureWorkspace(organizationId: string): void {
    integrationsStore.hydrate();
    if (!integrationsStore.getDeveloperSettings(organizationId)) {
      integrationsStore.setDeveloperSettings({
        organizationId,
        ...DEFAULT_DEVELOPER_SETTINGS,
      });
    }
  },

  listCatalog() {
    return CONNECTOR_CATALOG;
  },

  listConnections(organizationId: string): readonly IntegrationConnection[] {
    return integrationsStore
      .getSnapshot()
      .connections.filter((c) => c.organizationId === organizationId);
  },

  install(
    organizationId: string,
    connectorId: ConnectorId,
  ): IntegrationConnection {
    const def = getConnectorDefinition(connectorId);
    if (!def) throw new Error("integrations.errors.unknownConnector");
    const existing = this.listConnections(organizationId).find(
      (c) => c.connectorId === connectorId,
    );
    if (existing) return existing;

    const connection: IntegrationConnection = {
      id: createId("conn"),
      organizationId,
      connectorId,
      status: "installed",
      displayName: def.name,
      scopes: def.scopes,
      health: {
        status: "unknown",
        lastCheckedAt: nowIso(),
        message: "integrations.health.installedAuthorize",
      },
      installedAt: nowIso(),
      config: {},
    };
    integrationsStore.upsertConnection(connection);
    log(organizationId, "info", "connector", "integrations.logs.installed", {
      connectionId: connection.id,
      data: { name: def.name },
    });
    return connection;
  },

  async connect(
    organizationId: string,
    connectorId: ConnectorId,
  ): Promise<IntegrationConnection> {
    let connection =
      this.listConnections(organizationId).find(
        (c) => c.connectorId === connectorId,
      ) ?? this.install(organizationId, connectorId);

    const def = getConnectorDefinition(connectorId)!;

    if (def.authMethod === "oauth2" && def.oauthProvider) {
      const state = createId("oauth");
      const auth = await beginOAuth({
        providerId: def.oauthProvider,
        connectorId,
        organizationId,
        redirectUri: "https://app.agxora.local/oauth/callback",
        scopes: def.scopes,
        state,
        codeChallenge: createId("chal").slice(0, 32),
      });
      const vault = getSecretVault().store({
        kind: "oauth_token",
        plaintextPlaceholder: `pending:${auth.state}`,
      });
      connection = {
        ...connection,
        status: "connected",
        credentialRef: vault,
        connectedAt: nowIso(),
        health: {
          status: "healthy",
          lastCheckedAt: nowIso(),
          latencyMs: 55,
          message: auth.placeholder
            ? "integrations.health.oauthStubPlaceholder"
            : "integrations.health.oauthStubLive",
        },
        config: {
          ...connection.config,
          oauthState: auth.state,
          authorizationUrl: auth.authorizationUrl,
        },
      };
    } else if (def.authMethod === "api_key" || def.authMethod === "webhook") {
      const vault = getSecretVault().store({
        kind: "api_secret",
        plaintextPlaceholder: `stub_key_${connectorId}`,
      });
      connection = {
        ...connection,
        status: "connected",
        credentialRef: vault,
        connectedAt: nowIso(),
        health: {
          status: "healthy",
          lastCheckedAt: nowIso(),
          latencyMs: 42,
          message: "integrations.health.demoCredential",
        },
      };
    } else {
      connection = {
        ...connection,
        status: "connected",
        connectedAt: nowIso(),
        health: {
          status: "healthy",
          lastCheckedAt: nowIso(),
          message: "integrations.health.demoConnection",
        },
      };
    }

    integrationsStore.upsertConnection(connection);
    publishIntegrationEvent({
      organizationId,
      connectorId,
      eventType: "connected",
      payload: { connectionId: connection.id },
    });
    log(organizationId, "info", "connector", "integrations.logs.demoConnected", {
      connectionId: connection.id,
      data: { name: def.name },
    });
    return connection;
  },

  disconnect(connectionId: string): void {
    const snap = integrationsStore.getSnapshot();
    const connection = snap.connections.find((c) => c.id === connectionId);
    if (!connection) return;
    if (connection.credentialRef) {
      getSecretVault().revoke(connection.credentialRef.vaultRef);
    }
    integrationsStore.upsertConnection({
      ...connection,
      status: "disabled",
      credentialRef: undefined,
      health: {
        status: "unknown",
        lastCheckedAt: nowIso(),
        message: "integrations.health.disconnected",
      },
    });
    log(
      connection.organizationId,
      "warn",
      "connector",
      "integrations.logs.disconnected",
      { connectionId, data: { name: connection.displayName } },
    );
  },

  async diagnose(connectionId: string): Promise<IntegrationConnection | null> {
    const snap = integrationsStore.getSnapshot();
    const connection = snap.connections.find((c) => c.id === connectionId);
    if (!connection) return null;
    const provider = getConnectorProvider(connection.connectorId);
    const result = await provider.testConnection(connection);
      const next: IntegrationConnection = {
      ...connection,
      status: result.ok ? "connected" : "error",
      lastError: result.ok ? undefined : result.message,
      health: {
        status: result.ok ? "healthy" : "down",
        lastCheckedAt: nowIso(),
        latencyMs: result.latencyMs,
        message: result.message,
      },
    };
    integrationsStore.upsertConnection(next);
    log(
      connection.organizationId,
      result.ok ? "info" : "error",
      "diagnostics",
      result.message ?? "integrations.logs.diagnosticsComplete",
      { connectionId, data: { name: connection.displayName } },
    );
    return next;
  },

  async emitConnectorEvent(
    organizationId: string,
    connectorId: ConnectorId,
    eventType: string,
    payload?: Readonly<Record<string, unknown>>,
  ) {
    const event = publishIntegrationEvent({
      organizationId,
      connectorId,
      eventType,
      payload,
    });
    const connection = this.listConnections(organizationId).find(
      (c) => c.connectorId === connectorId && c.status === "connected",
    );
    if (connection) {
      await getConnectorProvider(connectorId).publishEvent?.(
        connection,
        eventType,
        payload ?? {},
      );
    }
    log(
      organizationId,
      "info",
      "event-bridge",
      "integrations.notice.publishedEvent",
      { connectionId: connection?.id, data: { type: event.type, eventId: event.id } },
    );
    return event;
  },

  createWebhook(input: {
    readonly organizationId: string;
    readonly name: string;
    readonly direction: WebhookEndpoint["direction"];
    readonly url: string;
    readonly events: readonly string[];
    readonly connectorId?: ConnectorId;
  }): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      id: createId("wh"),
      organizationId: input.organizationId,
      name: input.name,
      direction: input.direction,
      url: input.url,
      secretRef: createWebhookSecretRef(),
      enabled: true,
      events: input.events,
      connectorId: input.connectorId,
      createdAt: nowIso(),
    };
    integrationsStore.upsertWebhook(endpoint);
    log(input.organizationId, "info", "webhook", "integrations.logs.webhookCreated", {
      data: { name: endpoint.name },
    });
    return endpoint;
  },

  async sendWebhook(
    endpointId: string,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ) {
    const endpoint = integrationsStore
      .getSnapshot()
      .webhooks.find((w) => w.id === endpointId);
    if (!endpoint) throw new Error("integrations.errors.webhookNotFound");
    const delivery = await deliverOutgoingWebhook({
      endpoint,
      organizationId: endpoint.organizationId,
      eventType,
      payload,
    });
    integrationsStore.pushDelivery(delivery);
    log(
      endpoint.organizationId,
      delivery.status === "delivered" ? "info" : "error",
      "webhook",
      "integrations.logs.outgoing",
      { webhookId: endpoint.id, data: { status: delivery.status, eventType } },
    );
    return delivery;
  },

  receiveWebhook(
    endpointId: string,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
    signatureHeader?: string,
  ) {
    const endpoint = integrationsStore
      .getSnapshot()
      .webhooks.find((w) => w.id === endpointId);
    if (!endpoint) throw new Error("integrations.errors.webhookNotFound");
    const delivery = receiveIncomingWebhook({
      endpoint,
      organizationId: endpoint.organizationId,
      eventType,
      payload,
      signatureHeader,
    });
    integrationsStore.pushDelivery(delivery);
    if (delivery.status === "delivered") {
      publishIntegrationEvent({
        organizationId: endpoint.organizationId,
        connectorId: endpoint.connectorId ?? "custom",
        eventType,
        payload,
      });
    }
    return delivery;
  },

  createKey(input: {
    readonly organizationId: string;
    readonly name: string;
    readonly scopes: readonly string[];
    readonly expiresAt?: string;
  }): ApiKeyRecord {
    const key = createApiKey(input);
    integrationsStore.createApiKeyRecord(key);
    log(input.organizationId, "info", "api-keys", "integrations.logs.keyCreated", {
      data: { name: key.name },
    });
    return key;
  },

  rotateKey(keyId: string): ApiKeyRecord | null {
    const existing = integrationsStore
      .getSnapshot()
      .apiKeys.find((k) => k.id === keyId);
    if (!existing) return null;
    integrationsStore.upsertApiKey({ ...existing, status: "rotated" });
    const next = rotateApiKey(existing);
    integrationsStore.createApiKeyRecord(next);
    log(existing.organizationId, "warn", "api-keys", "integrations.logs.keyRotated", {
      data: { name: existing.name },
    });
    return next;
  },

  revokeKey(keyId: string): void {
    const existing = integrationsStore
      .getSnapshot()
      .apiKeys.find((k) => k.id === keyId);
    if (!existing) return;
    integrationsStore.upsertApiKey(revokeApiKey(existing));
    log(existing.organizationId, "warn", "api-keys", "integrations.logs.keyRevoked", {
      data: { name: existing.name },
    });
  },

  async exploreApi(input: {
    readonly organizationId: string;
    readonly method: string;
    readonly path: string;
    readonly apiKeyId?: string;
    readonly body?: Readonly<Record<string, unknown>>;
  }) {
    const apiKeyId = input.apiKeyId;
    if (apiKeyId) {
      const key = integrationsStore
        .getSnapshot()
        .apiKeys.find((k) => k.id === apiKeyId);
      if (key) {
        if (isApiKeyExpired(key) || key.status !== "active") {
          throw new Error("integrations.errors.apiKeyInactive");
        }
        integrationsStore.upsertApiKey(markApiKeyUsed(key));
      }
    }
    const { result, request } = await invokeApiGateway({
      organizationId: input.organizationId,
      method: input.method,
      path: input.path,
      apiKeyId,
      body: input.body,
    });
    const recorded: ApiGatewayRequest = {
      id: createId("areq"),
      ...request,
    };
    integrationsStore.pushApiRequest(recorded);
    return { result, request: recorded };
  },

  async sync(input: {
    readonly organizationId: string;
    readonly connectionId: string;
    readonly mode: SyncMode;
    readonly scheduleCron?: string;
  }) {
    const job = await runSyncJob({
      organizationId: input.organizationId,
      connectionId: input.connectionId,
      mode: input.mode,
      scheduleCron: input.scheduleCron,
      mapping: integrationsStore
        .getSnapshot()
        .mappings.find((m) => m.organizationId === input.organizationId),
    });
    integrationsStore.pushSyncJob(job);
    log(
      input.organizationId,
      job.status === "failed" ? "error" : "info",
      "sync",
      `Sync ${job.status}: ${job.recordsProcessed} records`,
      { connectionId: input.connectionId },
    );
    return job;
  },

  listGatewayRoutes() {
    return DEFAULT_GATEWAY_ROUTES;
  },

  getDeveloperSettings(organizationId: string): DeveloperSettings {
    return (
      integrationsStore.getDeveloperSettings(organizationId) ?? {
        organizationId,
        ...DEFAULT_DEVELOPER_SETTINGS,
      }
    );
  },

  saveDeveloperSettings(settings: DeveloperSettings): void {
    integrationsStore.setDeveloperSettings(settings);
  },
};
