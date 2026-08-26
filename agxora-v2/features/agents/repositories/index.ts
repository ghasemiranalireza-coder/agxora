/**
 * Agent OS repository — LocalStorage (demo) or REST (server / Phase 56).
 */

import {
  getAgentOsPersistenceMode,
  type AgentOsPersistenceMode,
} from "@/app/lib/agents/persistence/mode";
import {
  emptyAgentsState,
  filterStateForOrganization,
  normalizeState,
  type AgentsPersistedState,
  type LegacyAgentsPersistedState,
} from "./state";

export type {
  AgentsPersistedState,
  LegacyAgentsPersistedState,
} from "./state";
export {
  emptyAgentsState,
  filterStateForOrganization,
  normalizeState,
  stateContainsForeignOrganization,
} from "./state";

export interface AgentsRepository {
  load(): AgentsPersistedState | null;
  save(state: AgentsPersistedState): void;
  loadAsync?(): Promise<AgentsPersistedState | null>;
  saveAsync?(state: AgentsPersistedState): Promise<void>;
  setOrganizationId?(organizationId: string): void;
}

const STORAGE_KEY = "agxora-agent-os-v1";
const DEFAULT_API_PATH = "/api/v1/agents/os-state";
const SAVE_DEBOUNCE_MS = 200;

export class LocalAgentsRepository implements AgentsRepository {
  load(): AgentsPersistedState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeState(JSON.parse(raw) as LegacyAgentsPersistedState);
    } catch {
      return null;
    }
  }

  save(state: AgentsPersistedState): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // quota
    }
  }
}

/** In-memory repository for tests (multi-session simulation). */
export class MemoryAgentsRepository implements AgentsRepository {
  private state: AgentsPersistedState | null = null;

  load(): AgentsPersistedState | null {
    return this.state ? normalizeState(this.state) : null;
  }

  save(state: AgentsPersistedState): void {
    this.state = normalizeState(state) ?? emptyAgentsState();
  }

  clear(): void {
    this.state = null;
  }
}

export class RestAgentsRepository implements AgentsRepository {
  private cache: AgentsPersistedState | null = null;
  private organizationId: string | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: AgentsPersistedState | null = null;
  private inflight: Promise<void> | null = null;
  lastError: string | null = null;

  constructor(
    private readonly apiPath: string = DEFAULT_API_PATH,
    private readonly fetchImpl: typeof fetch = (...args) =>
      globalThis.fetch(...args),
  ) {}

  setOrganizationId(organizationId: string): void {
    this.organizationId = organizationId;
  }

  load(): AgentsPersistedState | null {
    return this.cache;
  }

  save(state: AgentsPersistedState): void {
    const scoped = this.scope(state);
    this.cache = scoped;
    this.pending = scoped;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  async loadAsync(): Promise<AgentsPersistedState | null> {
    this.lastError = null;
    const response = await this.fetchImpl(this.apiPath, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const message = await readErrorMessage(response);
      this.lastError = message;
      throw new Error(message);
    }
    const body = (await response.json()) as {
      ok?: boolean;
      state?: LegacyAgentsPersistedState;
    };
    const loaded = normalizeState(body.state ?? null) ?? emptyAgentsState();
    const scoped = this.organizationId
      ? filterStateForOrganization(loaded, this.organizationId)
      : loaded;
    this.cache = scoped;
    return scoped;
  }

  async saveAsync(state: AgentsPersistedState): Promise<void> {
    const scoped = this.scope(state);
    this.cache = scoped;
    this.pending = scoped;
    await this.flush();
  }

  private scope(state: AgentsPersistedState): AgentsPersistedState {
    if (!this.organizationId) {
      return normalizeState(state) ?? emptyAgentsState();
    }
    return filterStateForOrganization(state, this.organizationId);
  }

  private async flush(): Promise<void> {
    if (this.inflight) {
      await this.inflight;
    }
    const toSave = this.pending;
    if (!toSave) return;
    this.pending = null;
    this.inflight = this.put(toSave).finally(() => {
      this.inflight = null;
    });
    await this.inflight;
  }

  private async put(state: AgentsPersistedState): Promise<void> {
    this.lastError = null;
    const response = await this.fetchImpl(this.apiPath, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state }),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response);
      this.lastError = message;
      throw new Error(message);
    }
    const body = (await response.json()) as {
      state?: LegacyAgentsPersistedState;
    };
    if (body.state) {
      this.cache = normalizeState(body.state) ?? state;
    }
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; code?: string };
    if (body.message) return body.message;
    if (body.code) return `agent_os_${body.code}`;
  } catch {
    // ignore
  }
  return `agent_os_http_${response.status}`;
}

export function createAgentsRepositoryForMode(
  mode: AgentOsPersistenceMode = getAgentOsPersistenceMode(),
): AgentsRepository {
  if (mode === "server") {
    return new RestAgentsRepository();
  }
  return new LocalAgentsRepository();
}

export {
  getAgentOsPersistenceMode,
  isAgentOsServerMode,
} from "@/app/lib/agents/persistence/mode";
