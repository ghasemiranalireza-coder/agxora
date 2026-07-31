/**
 * Integration platform store — repository-backed.
 */

import {
  emptyIntegrationsState,
  LocalIntegrationsRepository,
  type IntegrationsPersistedState,
  type IntegrationsRepository,
} from "../repositories";
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

type Listener = () => void;

const listeners = new Set<Listener>();
let repository: IntegrationsRepository = new LocalIntegrationsRepository();

let state: IntegrationsPersistedState & { hydrated: boolean } = {
  ...emptyIntegrationsState(),
  hydrated: false,
};

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  const { hydrated: _h, ...payload } = state;
  void _h;
  repository.save(payload);
}

export function setIntegrationsRepository(repo: IntegrationsRepository): void {
  repository = repo;
}

export const integrationsStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): IntegrationsPersistedState & { hydrated: boolean } {
    return state;
  },

  hydrate(): void {
    if (state.hydrated) return;
    const loaded = repository.load();
    state = { ...(loaded ?? emptyIntegrationsState()), hydrated: true };
    emit();
  },

  upsertConnection(connection: IntegrationConnection): void {
    const idx = state.connections.findIndex((c) => c.id === connection.id);
    const connections = [...state.connections];
    if (idx >= 0) connections[idx] = connection;
    else connections.unshift(connection);
    state = { ...state, connections };
    persist();
    emit();
  },

  removeConnection(id: string): void {
    state = {
      ...state,
      connections: state.connections.filter((c) => c.id !== id),
    };
    persist();
    emit();
  },

  upsertWebhook(endpoint: WebhookEndpoint): void {
    const idx = state.webhooks.findIndex((w) => w.id === endpoint.id);
    const webhooks = [...state.webhooks];
    if (idx >= 0) webhooks[idx] = endpoint;
    else webhooks.unshift(endpoint);
    state = { ...state, webhooks };
    persist();
    emit();
  },

  pushDelivery(delivery: WebhookDelivery): void {
    state = {
      ...state,
      deliveries: [delivery, ...state.deliveries].slice(0, 200),
    };
    persist();
    emit();
  },

  upsertApiKey(key: ApiKeyRecord): void {
    const sanitized = { ...key, secretOnce: undefined };
    const idx = state.apiKeys.findIndex((k) => k.id === key.id);
    const apiKeys = [...state.apiKeys];
    if (idx >= 0) apiKeys[idx] = sanitized;
    else apiKeys.unshift(sanitized);
    state = { ...state, apiKeys };
    persist();
    emit();
  },

  /** Persist key metadata but return the original with secretOnce for one-time display. */
  createApiKeyRecord(key: ApiKeyRecord): ApiKeyRecord {
    this.upsertApiKey(key);
    return key;
  },

  pushApiRequest(req: ApiGatewayRequest): void {
    state = {
      ...state,
      apiRequests: [req, ...state.apiRequests].slice(0, 300),
    };
    persist();
    emit();
  },

  upsertMapping(profile: DataMappingProfile): void {
    const idx = state.mappings.findIndex((m) => m.id === profile.id);
    const mappings = [...state.mappings];
    if (idx >= 0) mappings[idx] = profile;
    else mappings.unshift(profile);
    state = { ...state, mappings };
    persist();
    emit();
  },

  pushSyncJob(job: SyncJob): void {
    state = {
      ...state,
      syncJobs: [job, ...state.syncJobs].slice(0, 100),
    };
    persist();
    emit();
  },

  pushLog(entry: IntegrationLogEntry): void {
    state = {
      ...state,
      logs: [entry, ...state.logs].slice(0, 300),
    };
    persist();
    emit();
  },

  setDeveloperSettings(settings: DeveloperSettings): void {
    const rest = state.developerSettings.filter(
      (s) => s.organizationId !== settings.organizationId,
    );
    state = {
      ...state,
      developerSettings: [settings, ...rest],
    };
    persist();
    emit();
  },

  getDeveloperSettings(
    organizationId: string,
  ): DeveloperSettings | undefined {
    return state.developerSettings.find(
      (s) => s.organizationId === organizationId,
    );
  },
};
