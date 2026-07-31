/**
 * Agent OS store — repository-backed.
 */

import {
  emptyAgentsState,
  LocalAgentsRepository,
  type AgentsPersistedState,
  type AgentsRepository,
} from "../repositories";
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

type Listener = () => void;

const listeners = new Set<Listener>();
let repository: AgentsRepository = new LocalAgentsRepository();

let state: AgentsPersistedState & { hydrated: boolean } = {
  ...emptyAgentsState(),
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

export function setAgentsRepository(repo: AgentsRepository): void {
  repository = repo;
}

export const agentsStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): AgentsPersistedState & { hydrated: boolean } {
    return state;
  },

  hydrate(): void {
    if (state.hydrated) return;
    const loaded = repository.load();
    state = { ...(loaded ?? emptyAgentsState()), hydrated: true };
    emit();
  },

  upsertRuntime(runtime: AgentRuntime): void {
    const idx = state.runtimes.findIndex((r) => r.instanceId === runtime.instanceId);
    const runtimes = [...state.runtimes];
    if (idx >= 0) runtimes[idx] = runtime;
    else runtimes.unshift(runtime);
    state = { ...state, runtimes };
    persist();
    emit();
  },

  upsertTask(task: AgentTask): void {
    const idx = state.tasks.findIndex((t) => t.id === task.id);
    const tasks = [...state.tasks];
    if (idx >= 0) tasks[idx] = task;
    else tasks.unshift(task);
    if (tasks.length > 300) tasks.length = 300;
    state = { ...state, tasks };
    persist();
    emit();
  },

  pushMemory(record: MemoryRecord): void {
    state = {
      ...state,
      memories: [record, ...state.memories].slice(0, 400),
    };
    persist();
    emit();
  },

  setKnowledge(docs: KnowledgeDocument[]): void {
    state = { ...state, knowledge: docs };
    persist();
    emit();
  },

  pushKnowledge(doc: KnowledgeDocument): void {
    state = {
      ...state,
      knowledge: [doc, ...state.knowledge.filter((d) => d.id !== doc.id)].slice(
        0,
        200,
      ),
    };
    persist();
    emit();
  },

  upsertPlan(plan: AgentPlan): void {
    const idx = state.plans.findIndex((p) => p.id === plan.id);
    const plans = [...state.plans];
    if (idx >= 0) plans[idx] = plan;
    else plans.unshift(plan);
    state = { ...state, plans: plans.slice(0, 100) };
    persist();
    emit();
  },

  pushTrace(trace: ReasoningTrace): void {
    state = {
      ...state,
      traces: [trace, ...state.traces].slice(0, 200),
    };
    persist();
    emit();
  },

  pushMessage(message: AgentMessage): void {
    state = {
      ...state,
      messages: [message, ...state.messages].slice(0, 200),
    };
    persist();
    emit();
  },

  upsertContext(ctx: AgentContextBundle): void {
    const rest = state.contexts.filter(
      (c) => c.organizationId !== ctx.organizationId,
    );
    state = { ...state, contexts: [ctx, ...rest] };
    persist();
    emit();
  },

  setSettings(settings: AgentOsSettings): void {
    const rest = state.settings.filter(
      (s) => s.organizationId !== settings.organizationId,
    );
    state = { ...state, settings: [settings, ...rest] };
    persist();
    emit();
  },

  getSettings(organizationId: string): AgentOsSettings | undefined {
    return state.settings.find((s) => s.organizationId === organizationId);
  },

  bumpToolInvocations(): void {
    state = {
      ...state,
      toolInvocationCount24h: state.toolInvocationCount24h + 1,
    };
    persist();
    emit();
  },
};
