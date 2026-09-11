/**
 * Connector provider registry — register runtime adapters without UI coupling.
 */

import type {
  ConnectorId,
  IntegrationConnection,
} from "../types";

export interface ConnectorProvider {
  readonly id: ConnectorId;
  readonly testConnection: (
    connection: IntegrationConnection,
  ) => Promise<{ ok: boolean; latencyMs: number; message?: string }>;
  readonly publishEvent?: (
    connection: IntegrationConnection,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ) => Promise<void>;
  readonly consumeEvent?: (
    connection: IntegrationConnection,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ) => Promise<void>;
}

const providers = new Map<ConnectorId, ConnectorProvider>();

/**
 * Architecture placeholder. Stub providers have no live backend and must
 * NEVER report a healthy or connected state.
 */
function stubProvider(id: ConnectorId): ConnectorProvider {
  return {
    id,
    async testConnection() {
      return {
        ok: false,
        latencyMs: 0,
        message: "integrations.noticeDefault",
      };
    },
    async publishEvent() {
      // Outbound publish placeholder
    },
    async consumeEvent() {
      // Inbound consume placeholder
    },
  };
}

for (const id of [
  "microsoft365",
  "google_workspace",
  "slack",
  "discord",
  "dropbox",
  "onedrive",
  "google_drive",
  "hubspot",
  "salesforce",
  "zapier",
  "make",
  "github",
  "gitlab",
  "custom",
] as const) {
  providers.set(id, stubProvider(id));
}

export function registerConnectorProvider(provider: ConnectorProvider): void {
  providers.set(provider.id, provider);
}

export function getConnectorProvider(id: ConnectorId): ConnectorProvider {
  return providers.get(id) ?? stubProvider(id);
}

export function listRegisteredConnectorProviders(): readonly ConnectorProvider[] {
  return Array.from(providers.values());
}
