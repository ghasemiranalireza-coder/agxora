/**
 * Integration repository — LocalStorage now, REST later.
 */

import type {
  ApiGatewayRequest,
  ApiKeyRecord,
  DataMappingProfile,
  DeveloperSettings,
  IntegrationConnection,
  IntegrationLogEntry,
  SyncJob,
  WebhookDelivery,
  WebhookEndpoint,
} from "../types";

export interface IntegrationsPersistedState {
  readonly version: 1;
  readonly connections: IntegrationConnection[];
  readonly webhooks: WebhookEndpoint[];
  readonly deliveries: WebhookDelivery[];
  readonly apiKeys: ApiKeyRecord[];
  readonly apiRequests: ApiGatewayRequest[];
  readonly mappings: DataMappingProfile[];
  readonly syncJobs: SyncJob[];
  readonly logs: IntegrationLogEntry[];
  readonly developerSettings: DeveloperSettings[];
}

export interface IntegrationsRepository {
  load(): IntegrationsPersistedState | null;
  save(state: IntegrationsPersistedState): void;
}

const STORAGE_KEY = "agxora-integrations-platform-v1";

export class LocalIntegrationsRepository implements IntegrationsRepository {
  load(): IntegrationsPersistedState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as IntegrationsPersistedState;
    } catch {
      return null;
    }
  }

  save(state: IntegrationsPersistedState): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // quota
    }
  }
}

export class RestIntegrationsRepository implements IntegrationsRepository {
  constructor(private readonly baseUrl: string) {
    void this.baseUrl;
  }

  load(): IntegrationsPersistedState | null {
    return null;
  }

  save(state: IntegrationsPersistedState): void {
    void state;
  }
}

export function emptyIntegrationsState(): IntegrationsPersistedState {
  return {
    version: 1,
    connections: [],
    webhooks: [],
    deliveries: [],
    apiKeys: [],
    apiRequests: [],
    mappings: [],
    syncJobs: [],
    logs: [],
    developerSettings: [],
  };
}
