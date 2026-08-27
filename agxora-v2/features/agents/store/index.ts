/**
 * Agent OS store — repository-backed.
 */

import {
  emptyAgentsState,
  filterStateForOrganization,
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
let hydratedOrganizationId: string | null = null;
let hydrateInflight: Promise<void> | null = null;
let lastPersistenceError: string | null = null;

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
  const orgId =
    hydratedOrganizationId ??
    (typeof repository.getAuthoritativeOrganizationId === "function"
      ? repository.getAuthoritativeOrganizationId()
      : null);
  const scoped =
    orgId != null ? filterStateForOrganization(payload, orgId) : payload;
  try {
    repository.save(scoped);
  } catch (error) {
    // Rest refuses unresolved/mismatch writes; keep memory, expose via getLastError.
    void error;
  }
}

export function setAgentsRepository(repo: AgentsRepository): void {
  repository = repo;
  hydratedOrganizationId = null;
  lastPersistenceError = null;
  state = { ...emptyAgentsState(), hydrated: false };
}

export function getAgentsRepository(): AgentsRepository {
  return repository;
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

  getHydratedOrganizationId(): string | null {
    return hydratedOrganizationId;
  },

  getLastPersistenceError(): string | null {
    return (
      lastPersistenceError ??
      (typeof repository.getLastError === "function"
        ? repository.getLastError()
        : null)
    );
  },

  isPersistenceDirty(): boolean {
    return typeof repository.isDirty === "function"
      ? repository.isDirty()
      : false;
  },

  hasPendingPersistence(): boolean {
    return typeof repository.hasPendingOrInflight === "function"
      ? repository.hasPendingOrInflight()
      : false;
  },

  async flushPersistence(): Promise<void> {
    if (typeof repository.flushNow === "function") {
      try {
        await repository.flushNow();
        lastPersistenceError = null;
      } catch (error) {
        lastPersistenceError =
          error instanceof Error ? error.message : "agent_os_flush_failed";
        throw error;
      }
    }
  },

  /**
   * Sync hydrate (local / cached). Sticky unless force or org changed.
   */
  hydrate(options?: {
    readonly force?: boolean;
    readonly organizationId?: string;
  }): void {
    const organizationId = options?.organizationId;
    const force = options?.force === true;
    const orgChanged =
      organizationId != null &&
      hydratedOrganizationId != null &&
      organizationId !== hydratedOrganizationId;

    if (state.hydrated && !force && !orgChanged) return;

    if (orgChanged || (force && organizationId != null)) {
      state = { ...emptyAgentsState(), hydrated: false };
      hydratedOrganizationId = null;
      emit();
    }

    const loaded = repository.load();
    const next = loaded ?? emptyAgentsState();
    const authOrg =
      typeof repository.getAuthoritativeOrganizationId === "function"
        ? repository.getAuthoritativeOrganizationId()
        : null;
    const scopeOrg = authOrg ?? organizationId;
    state = {
      ...(scopeOrg ? filterStateForOrganization(next, scopeOrg) : next),
      hydrated: true,
    };
    hydratedOrganizationId = scopeOrg ?? hydratedOrganizationId;
    emit();
  },

  /**
   * Async hydrate for server repositories.
   * Skips remote GET while dirty/pending unless forceOrgSwitch.
   * Adopts authoritative organizationId from the server repository.
   */
  async hydrateAsync(options?: {
    readonly force?: boolean;
    readonly organizationId?: string;
    /** When true, flush then clear and load even if dirty (org/session switch). */
    readonly forceOrgSwitch?: boolean;
  }): Promise<void> {
    const organizationId = options?.organizationId;
    const force = options?.force === true;
    const forceOrgSwitch = options?.forceOrgSwitch === true;
    const orgChanged =
      organizationId != null &&
      hydratedOrganizationId != null &&
      organizationId !== hydratedOrganizationId;

    if (state.hydrated && !force && !orgChanged && !repository.loadAsync) {
      return;
    }

    if (hydrateInflight) {
      await hydrateInflight;
      if (state.hydrated && !force && !orgChanged && !forceOrgSwitch) return;
    }

    const run = async () => {
      const dirty =
        typeof repository.isDirty === "function" && repository.isDirty();
      const pending =
        typeof repository.hasPendingOrInflight === "function" &&
        repository.hasPendingOrInflight();

      // High #1: never force-hydrate (or wait on flush/GET) while local
      // persistence is pending/in-flight. Soft/visibility refresh keeps memory.
      // Flush is owned by AgentOsBridge / flushPersistence — not hydrate.
      if ((dirty || pending) && !forceOrgSwitch) {
        return;
      }

      if (forceOrgSwitch || orgChanged) {
        if (typeof repository.flushNow === "function") {
          try {
            await repository.flushNow();
          } catch {
            // Best-effort flush before switching orgs.
          }
        }
        state = { ...emptyAgentsState(), hydrated: false };
        hydratedOrganizationId = null;
        emit();
      } else if (force) {
        // Soft force refresh with clean state: do not clear until GET succeeds.
      }

      let loaded: AgentsPersistedState | null = null;
      if (typeof repository.loadAsync === "function") {
        loaded = await repository.loadAsync();
      } else {
        loaded = repository.load();
      }

      // If loadAsync returned early due to dirty/pending, preserve memory.
      if (
        !forceOrgSwitch &&
        ((typeof repository.isDirty === "function" && repository.isDirty()) ||
          (typeof repository.hasPendingOrInflight === "function" &&
            repository.hasPendingOrInflight()))
      ) {
        return;
      }

      const next = loaded ?? emptyAgentsState();
      const authOrg =
        typeof repository.getAuthoritativeOrganizationId === "function"
          ? repository.getAuthoritativeOrganizationId()
          : null;
      // High #3: never scope with a divergent client org id.
      const scopeOrg = authOrg ?? null;
      if (!scopeOrg && organizationId && !repository.loadAsync) {
        // Local mode may use the provided organizationId.
        state = {
          ...filterStateForOrganization(next, organizationId),
          hydrated: true,
        };
        hydratedOrganizationId = organizationId;
        emit();
        return;
      }

      state = {
        ...(scopeOrg ? filterStateForOrganization(next, scopeOrg) : next),
        hydrated: true,
      };
      hydratedOrganizationId = scopeOrg;
      lastPersistenceError = null;
      emit();
    };

    hydrateInflight = run().finally(() => {
      hydrateInflight = null;
    });
    await hydrateInflight;
  },

  /** Clear in-memory state without writing (logout / org teardown). */
  clearMemory(): void {
    state = { ...emptyAgentsState(), hydrated: false };
    hydratedOrganizationId = null;
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

  upsertCampaign(campaign: import("../campaigns/types").Campaign): void {
    const idx = state.campaigns.findIndex((item) => item.id === campaign.id);
    const campaigns = [...state.campaigns];
    if (idx >= 0) campaigns[idx] = campaign;
    else campaigns.unshift(campaign);
    state = { ...state, campaigns: campaigns.slice(0, 50) };
    persist();
    emit();
  },

  replaceGrowthInsights(
    organizationId: string,
    insights: readonly import("../campaigns/types").GrowthInsight[],
  ): void {
    const others = state.growthInsights.filter(
      (item) => item.organizationId !== organizationId,
    );
    state = {
      ...state,
      growthInsights: [...insights, ...others].slice(0, 200),
    };
    persist();
    emit();
  },

  nextExecutionQueueSeq(): number {
    return state.executionJobs.reduce((max, job) => Math.max(max, job.queueSeq), 0) + 1;
  },

  upsertExecutionJob(job: import("../execution/jobs").ExecutionJob): void {
    const idx = state.executionJobs.findIndex((item) => item.id === job.id);
    const executionJobs = [...state.executionJobs];
    if (idx >= 0) executionJobs[idx] = job;
    else executionJobs.unshift(job);
    state = { ...state, executionJobs: executionJobs.slice(0, 200) };
    persist();
    emit();
  },

  pushExecutionAttempt(attempt: import("../execution/jobs").ExecutionAttempt): void {
    state = {
      ...state,
      executionAttempts: [attempt, ...state.executionAttempts].slice(0, 400),
    };
    persist();
    emit();
  },

  pushExecutionEvent(event: import("../execution/jobs").ExecutionEvent): void {
    state = {
      ...state,
      executionEvents: [event, ...state.executionEvents].slice(0, 400),
    };
    persist();
    emit();
  },

  upsertGrowthCrmLink(link: import("../crm/types").GrowthCrmLink): void {
    const idx = state.growthCrmLinks.findIndex((item) => item.id === link.id);
    const growthCrmLinks = [...state.growthCrmLinks];
    if (idx >= 0) growthCrmLinks[idx] = link;
    else growthCrmLinks.unshift(link);
    state = { ...state, growthCrmLinks: growthCrmLinks.slice(0, 100) };
    persist();
    emit();
  },

  upsertCampaignCrmSync(sync: import("../crm/types").CampaignCrmSync): void {
    const idx = state.campaignCrmSyncs.findIndex((item) => item.id === sync.id);
    const campaignCrmSyncs = [...state.campaignCrmSyncs];
    if (idx >= 0) campaignCrmSyncs[idx] = sync;
    else campaignCrmSyncs.unshift(sync);
    state = { ...state, campaignCrmSyncs: campaignCrmSyncs.slice(0, 100) };
    persist();
    emit();
  },

  upsertGrowthCrmFollowUp(followUp: import("../crm/types").GrowthCrmFollowUp): void {
    const idx = state.crmFollowUps.findIndex((item) => item.id === followUp.id);
    const crmFollowUps = [...state.crmFollowUps];
    if (idx >= 0) crmFollowUps[idx] = followUp;
    else crmFollowUps.unshift(followUp);
    state = { ...state, crmFollowUps: crmFollowUps.slice(0, 200) };
    persist();
    emit();
  },

  upsertCreativeProject(
    project: import("../creative/types").CreativeProject,
  ): void {
    const idx = state.creativeProjects.findIndex((item) => item.id === project.id);
    const creativeProjects = [...state.creativeProjects];
    if (idx >= 0) creativeProjects[idx] = project;
    else creativeProjects.unshift(project);
    state = { ...state, creativeProjects: creativeProjects.slice(0, 100) };
    persist();
    emit();
  },
};
