/**
 * Agent OS repository — LocalStorage now, REST later.
 */

import type {
  AgentApproval,
  AgentContextBundle,
  AgentExecution,
  AgentMessage,
  AgentOsSettings,
  AgentPlan,
  AgentRuntime,
  AgentTask,
  KnowledgeDocument,
  MemoryRecord,
  ReasoningTrace,
  StepExecution,
} from "../types";

export interface AgentsPersistedState {
  readonly version: 2;
  readonly runtimes: AgentRuntime[];
  readonly tasks: AgentTask[];
  readonly executions: AgentExecution[];
  readonly approvals: AgentApproval[];
  readonly stepExecutions: StepExecution[];
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

function normalizeState(
  state: Partial<AgentsPersistedState> | null,
): AgentsPersistedState | null {
  if (!state) return null;
  return {
    version: 2,
    runtimes: Array.isArray(state.runtimes) ? [...state.runtimes] : [],
    tasks: Array.isArray(state.tasks) ? [...state.tasks] : [],
    executions: Array.isArray(state.executions) ? [...state.executions] : [],
    approvals: Array.isArray(state.approvals) ? [...state.approvals] : [],
    stepExecutions: Array.isArray(state.stepExecutions)
      ? [...state.stepExecutions]
      : [],
    memories: Array.isArray(state.memories) ? [...state.memories] : [],
    knowledge: Array.isArray(state.knowledge) ? [...state.knowledge] : [],
    plans: Array.isArray(state.plans) ? [...state.plans] : [],
    traces: Array.isArray(state.traces) ? [...state.traces] : [],
    messages: Array.isArray(state.messages) ? [...state.messages] : [],
    contexts: Array.isArray(state.contexts) ? [...state.contexts] : [],
    settings: Array.isArray(state.settings) ? [...state.settings] : [],
    toolInvocationCount24h:
      typeof state.toolInvocationCount24h === "number"
        ? state.toolInvocationCount24h
        : 0,
  };
}

export class LocalAgentsRepository implements AgentsRepository {
  load(): AgentsPersistedState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeState(JSON.parse(raw) as Partial<AgentsPersistedState>);
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
    version: 2,
    runtimes: [],
    tasks: [],
    executions: [],
    approvals: [],
    stepExecutions: [],
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
