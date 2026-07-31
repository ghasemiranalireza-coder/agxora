/**
 * Agent OS repository — LocalStorage now, REST later.
 */

import type {
  AgentContextBundle,
  AgentMessage,
  AgentOsSettings,
  AgentPlan,
  AgentRuntime,
  AgentTask,
  KnowledgeDocument,
  MemoryRecord,
  ReasoningTrace,
} from "../types";

export interface AgentsPersistedState {
  readonly version: 1;
  readonly runtimes: AgentRuntime[];
  readonly tasks: AgentTask[];
  readonly memories: MemoryRecord[];
  readonly knowledge: KnowledgeDocument[];
  readonly plans: AgentPlan[];
  readonly traces: ReasoningTrace[];
  readonly messages: AgentMessage[];
  readonly contexts: AgentContextBundle[];
  readonly settings: AgentOsSettings[];
  readonly toolInvocationCount24h: number;
}

export interface AgentsRepository {
  load(): AgentsPersistedState | null;
  save(state: AgentsPersistedState): void;
}

const STORAGE_KEY = "agxora-agent-os-v1";

export class LocalAgentsRepository implements AgentsRepository {
  load(): AgentsPersistedState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AgentsPersistedState;
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

export class RestAgentsRepository implements AgentsRepository {
  constructor(private readonly baseUrl: string) {
    void this.baseUrl;
  }

  load(): AgentsPersistedState | null {
    return null;
  }

  save(state: AgentsPersistedState): void {
    void state;
  }
}

export function emptyAgentsState(): AgentsPersistedState {
  return {
    version: 1,
    runtimes: [],
    tasks: [],
    memories: [],
    knowledge: [],
    plans: [],
    traces: [],
    messages: [],
    contexts: [],
    settings: [],
    toolInvocationCount24h: 0,
  };
}
