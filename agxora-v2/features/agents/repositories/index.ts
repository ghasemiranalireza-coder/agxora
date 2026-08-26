/**
 * Agent OS repository — LocalStorage (demo) or REST (server / Phase 56).
 *
 * Server-mode durability rules:
 * - Server response organizationId is authoritative.
 * - Dirty/pending state is never discarded by a stale GET.
 * - PUT failures keep pending state for retry (no localStorage fallback).
 * - flush() drains pending until empty after each in-flight PUT.
 */

import {
  getAgentOsPersistenceMode,
  type AgentOsPersistenceMode,
} from "@/app/lib/agents/persistence/mode";
import { assertProductionAgentOsLocalPersistenceBlocked } from "@/app/lib/production/firstCustomerGate";
import {
  emptyAgentsState,
  filterStateForOrganization,
  normalizeState,
  stateContainsForeignOrganization,
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
  /** Authoritative org from last successful server response (server mode). */
  getAuthoritativeOrganizationId?(): string | null;
  /** True when local mutations are not yet ACK'd by the server. */
  isDirty?(): boolean;
  hasPendingOrInflight?(): boolean;
  /** Flush debounce + drain pending PUTs. */
  flushNow?(): Promise<void>;
  getLastError?(): string | null;
  clearLastError?(): void;
}

const STORAGE_KEY = "agxora-agent-os-v1";
const DEFAULT_API_PATH = "/api/v1/agents/os-state";
const SAVE_DEBOUNCE_MS = 200;

function isEffectivelyEmpty(state: AgentsPersistedState | null): boolean {
  if (!state) return true;
  return (
    state.growthProfiles.length === 0 &&
    state.campaigns.length === 0 &&
    state.growthCrmLinks.length === 0 &&
    state.campaignCrmSyncs.length === 0 &&
    state.crmFollowUps.length === 0 &&
    state.tasks.length === 0 &&
    state.approvals.length === 0 &&
    state.executionJobs.length === 0 &&
    state.executionEvents.length === 0 &&
    state.runtimes.length === 0 &&
    state.executions.length === 0
  );
}

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
  /** Authoritative org from server responses only. */
  private authoritativeOrganizationId: string | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: AgentsPersistedState | null = null;
  private pendingGeneration = 0;
  private localGeneration = 0;
  private ackedGeneration = 0;
  private inflight: Promise<void> | null = null;
  private inflightGeneration = 0;
  lastError: string | null = null;
  private pageLifecycleBound = false;

  constructor(
    private readonly apiPath: string = DEFAULT_API_PATH,
    private readonly fetchImpl: typeof fetch = (...args) =>
      globalThis.fetch(...args),
  ) {
    this.bindPageLifecycle();
  }

  /**
   * Hint only before first server response. Never overrides an authoritative
   * server organizationId once known.
   */
  setOrganizationId(organizationId: string): void {
    // Client hints never become authoritative (High #3).
    void organizationId;
  }

  /**
   * Adopt server org after a successful authenticated response.
   * Exposed for tests and bootstrap after login.
   */
  adoptAuthoritativeOrganizationId(organizationId: string): void {
    this.authoritativeOrganizationId = organizationId;
  }

  getAuthoritativeOrganizationId(): string | null {
    return this.authoritativeOrganizationId;
  }

  isDirty(): boolean {
    return this.localGeneration > this.ackedGeneration;
  }

  hasPendingOrInflight(): boolean {
    return this.pending != null || this.inflight != null || this.saveTimer != null;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  clearLastError(): void {
    this.lastError = null;
  }

  load(): AgentsPersistedState | null {
    return this.cache;
  }

  save(state: AgentsPersistedState): void {
    const scoped = this.scopeForWrite(state);
    this.localGeneration += 1;
    this.cache = scoped;
    this.pending = scoped;
    this.pendingGeneration = this.localGeneration;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush().catch(() => {
        // lastError already set; keep pending for retry
      });
    }, SAVE_DEBOUNCE_MS);
  }

  async loadAsync(): Promise<AgentsPersistedState | null> {
    // Never replace newer unsaved local state with a GET.
    if (this.isDirty() || this.hasPendingOrInflight()) {
      return this.cache;
    }

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
      organizationId?: string;
      state?: LegacyAgentsPersistedState;
    };

    const serverOrgId =
      typeof body.organizationId === "string" && body.organizationId.trim()
        ? body.organizationId.trim()
        : null;
    if (!serverOrgId) {
      this.lastError = "agent_os_missing_server_organization";
      throw new Error(this.lastError);
    }

    // Re-check dirty after await — a save may have landed during GET.
    if (this.isDirty() || this.hasPendingOrInflight()) {
      return this.cache;
    }

    this.authoritativeOrganizationId = serverOrgId;
    const loaded = normalizeState(body.state ?? null) ?? emptyAgentsState();
    // Scope only by authoritative server org — never by a divergent client id.
    const scoped = filterStateForOrganization(loaded, serverOrgId);
    this.cache = scoped;
    this.ackedGeneration = this.localGeneration;
    return scoped;
  }

  async saveAsync(state: AgentsPersistedState): Promise<void> {
    const scoped = this.scopeForWrite(state);
    this.localGeneration += 1;
    this.cache = scoped;
    this.pending = scoped;
    this.pendingGeneration = this.localGeneration;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.flush();
  }

  async flushNow(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.flush();
  }

  private scopeForWrite(state: AgentsPersistedState): AgentsPersistedState {
    const orgId = this.authoritativeOrganizationId;
    if (!orgId) {
      // Refuse writes until server org is known — prevents empty overwrite.
      this.lastError = "agent_os_org_unresolved";
      throw new Error(this.lastError);
    }
    const normalized = normalizeState(state) ?? emptyAgentsState();
    const scoped = filterStateForOrganization(normalized, orgId);

    // High #3: never PUT an empty snapshot when input only had foreign-org rows
    // (client/server org mismatch) while we already hold non-empty server state.
    if (
      isEffectivelyEmpty(scoped) &&
      !isEffectivelyEmpty(normalized) &&
      stateContainsForeignOrganization(normalized, orgId) &&
      !isEffectivelyEmpty(this.cache)
    ) {
      this.lastError = "agent_os_org_mismatch_refused_empty_put";
      throw new Error(this.lastError);
    }

    return scoped;
  }

  private async flush(): Promise<void> {
    // Drain until no pending remains after each PUT (concurrent saves).
    while (true) {
      if (this.inflight) {
        try {
          await this.inflight;
        } catch {
          // prior failure already restored pending / lastError
        }
      }

      const toSave = this.pending;
      if (!toSave) return;
      const generation = this.pendingGeneration;
      this.pending = null;
      this.inflightGeneration = generation;

      this.inflight = this.put(toSave, generation).finally(() => {
        this.inflight = null;
      });

      try {
        await this.inflight;
      } catch (error) {
        // Keep pending for retry; surface failure to callers.
        throw error;
      }
    }
  }

  private async put(
    state: AgentsPersistedState,
    generation: number,
  ): Promise<void> {
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
      // Restore pending if nothing newer arrived.
      if (this.pending == null || this.pendingGeneration <= generation) {
        this.pending = state;
        this.pendingGeneration = generation;
      }
      throw new Error(message);
    }

    const body = (await response.json()) as {
      organizationId?: string;
      state?: LegacyAgentsPersistedState;
    };
    if (typeof body.organizationId === "string" && body.organizationId.trim()) {
      this.authoritativeOrganizationId = body.organizationId.trim();
    }

    // ACK this generation unless a newer pending snapshot exists.
    if (
      this.pending == null ||
      this.pendingGeneration <= generation
    ) {
      this.ackedGeneration = Math.max(this.ackedGeneration, generation);
    }

    // Apply server echo only when fully caught up (no newer local gen).
    if (
      body.state &&
      this.pending == null &&
      this.ackedGeneration >= this.localGeneration
    ) {
      const orgId = this.authoritativeOrganizationId;
      const normalized = normalizeState(body.state) ?? state;
      this.cache = orgId
        ? filterStateForOrganization(normalized, orgId)
        : normalized;
    }
  }

  private bindPageLifecycle(): void {
    if (this.pageLifecycleBound) return;
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    this.pageLifecycleBound = true;
    const flushSafe = () => {
      if (!this.hasPendingOrInflight() && !this.isDirty()) return;
      void this.flushNow().catch(() => undefined);
    };
    // pagehide is more reliable than beforeunload for modern browsers.
    window.addEventListener("pagehide", flushSafe);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushSafe();
    });
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
  if (mode === "local") {
    assertProductionAgentOsLocalPersistenceBlocked();
    return new LocalAgentsRepository();
  }
  return new RestAgentsRepository();
}

export {
  getAgentOsPersistenceMode,
  isAgentOsServerMode,
} from "@/app/lib/agents/persistence/mode";
