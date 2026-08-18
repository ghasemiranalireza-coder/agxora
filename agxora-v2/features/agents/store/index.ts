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

  reset(): void {
    state = { ...emptyAgentsState(), hydrated: true };
    persist();
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

  upsertExecution(execution: AgentExecution): void {
    const idx = state.executions.findIndex((e) => e.id === execution.id);
    const executions = [...state.executions];
    if (idx >= 0) executions[idx] = execution;
    else executions.unshift(execution);
    if (executions.length > 300) executions.length = 300;
    state = { ...state, executions };
    persist();
    emit();
  },

  upsertApproval(approval: AgentApproval): void {
    const idx = state.approvals.findIndex((a) => a.id === approval.id);
    const approvals = [...state.approvals];
    if (idx >= 0) approvals[idx] = approval;
    else approvals.unshift(approval);
    if (approvals.length > 300) approvals.length = 300;
    state = { ...state, approvals };
    persist();
    emit();
  },

  pushStepExecution(stepExecution: StepExecution): void {
    state = {
      ...state,
      stepExecutions: [stepExecution, ...state.stepExecutions].slice(0, 1000),
    };
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

  upsertGrowthProfile(profile: import("../growth/types").GrowthBusinessProfile): void {
    const idx = state.growthProfiles.findIndex((item) => item.id === profile.id);
    const growthProfiles = [...state.growthProfiles];
    if (idx >= 0) growthProfiles[idx] = profile;
    else growthProfiles.unshift(profile);
    state = { ...state, growthProfiles: growthProfiles.slice(0, 50) };
    persist();
    emit();
  },

  upsertGrowthStrategy(strategy: import("../growth/types").GrowthStrategy): void {
    const idx = state.growthStrategies.findIndex((item) => item.id === strategy.id);
    const growthStrategies = [...state.growthStrategies];
    if (idx >= 0) growthStrategies[idx] = strategy;
    else growthStrategies.unshift(strategy);
    state = { ...state, growthStrategies: growthStrategies.slice(0, 50) };
    persist();
    emit();
  },

  upsertWebsiteProject(project: import("../website/types").WebsiteProject): void {
    const idx = state.websiteProjects.findIndex((item) => item.id === project.id);
    const websiteProjects = [...state.websiteProjects];
    if (idx >= 0) websiteProjects[idx] = project;
    else websiteProjects.unshift(project);
    state = { ...state, websiteProjects: websiteProjects.slice(0, 50) };
    persist();
    emit();
  },

  upsertSocialAccount(account: import("../social/types").SocialAccount): void {
    const idx = state.socialAccounts.findIndex((item) => item.id === account.id);
    const socialAccounts = [...state.socialAccounts];
    if (idx >= 0) socialAccounts[idx] = account;
    else socialAccounts.unshift(account);
    state = { ...state, socialAccounts: socialAccounts.slice(0, 50) };
    persist();
    emit();
  },

  upsertSocialStrategy(strategy: import("../social/types").SocialStrategy): void {
    const idx = state.socialStrategies.findIndex((item) => item.id === strategy.id);
    const socialStrategies = [...state.socialStrategies];
    if (idx >= 0) socialStrategies[idx] = strategy;
    else socialStrategies.unshift(strategy);
    state = { ...state, socialStrategies: socialStrategies.slice(0, 50) };
    persist();
    emit();
  },

  upsertSocialCalendar(calendar: import("../social/types").SocialContentCalendar): void {
    const idx = state.socialCalendars.findIndex((item) => item.id === calendar.id);
    const socialCalendars = [...state.socialCalendars];
    if (idx >= 0) socialCalendars[idx] = calendar;
    else socialCalendars.unshift(calendar);
    state = { ...state, socialCalendars: socialCalendars.slice(0, 50) };
    persist();
    emit();
  },

  replaceSocialContent(
    organizationId: string,
    items: readonly import("../social/types").SocialContentItem[],
  ): void {
    const others = state.socialContent.filter(
      (item) => item.organizationId !== organizationId,
    );
    state = {
      ...state,
      socialContent: [...items, ...others].slice(0, 400),
    };
    persist();
    emit();
  },

  upsertSocialContent(item: import("../social/types").SocialContentItem): void {
    const idx = state.socialContent.findIndex((row) => row.id === item.id);
    const socialContent = [...state.socialContent];
    if (idx >= 0) socialContent[idx] = item;
    else socialContent.unshift(item);
    state = { ...state, socialContent: socialContent.slice(0, 400) };
    persist();
    emit();
  },

  upsertPublishingJob(job: import("../social/types").SocialPublishingJob): void {
    const idx = state.publishingJobs.findIndex((item) => item.id === job.id);
    const publishingJobs = [...state.publishingJobs];
    if (idx >= 0) publishingJobs[idx] = job;
    else publishingJobs.unshift(job);
    state = { ...state, publishingJobs: publishingJobs.slice(0, 200) };
    persist();
    emit();
  },
};
