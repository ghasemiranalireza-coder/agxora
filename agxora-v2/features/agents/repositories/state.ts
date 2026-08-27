/**
 * AgentsPersistedState v7 — normalize, empty, org filter.
 * Shared by Local/REST repositories and server persistence.
 */

import type {
  CampaignCrmSync,
  GrowthCrmFollowUp,
  GrowthCrmLink,
} from "../crm/types";
import type { ExecutionAttempt, ExecutionEvent, ExecutionJob } from "../execution/jobs";
import type { GrowthInsight, Campaign } from "../campaigns/types";
import type { GrowthBusinessProfile, GrowthStrategy } from "../growth/types";
import type {
  SocialAccount,
  SocialContentCalendar,
  SocialContentItem,
  SocialPublishingJob,
  SocialStrategy,
} from "../social/types";
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
import type { WebsiteProject } from "../website/types";
import type { CreativeProject } from "../creative/types";

export interface AgentsPersistedState {
  readonly version: 7;
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
  readonly growthProfiles: GrowthBusinessProfile[];
  readonly growthStrategies: GrowthStrategy[];
  readonly websiteProjects: WebsiteProject[];
  readonly socialAccounts: SocialAccount[];
  readonly socialStrategies: SocialStrategy[];
  readonly socialCalendars: SocialContentCalendar[];
  readonly socialContent: SocialContentItem[];
  readonly publishingJobs: SocialPublishingJob[];
  readonly campaigns: Campaign[];
  readonly growthInsights: GrowthInsight[];
  readonly executionJobs: ExecutionJob[];
  readonly executionAttempts: ExecutionAttempt[];
  readonly executionEvents: ExecutionEvent[];
  readonly growthCrmLinks: GrowthCrmLink[];
  readonly campaignCrmSyncs: CampaignCrmSync[];
  readonly crmFollowUps: GrowthCrmFollowUp[];
  /** Phase 58 — creative production projects (metadata + specs; no blobs). */
  readonly creativeProjects: CreativeProject[];
}

export type LegacyAgentsPersistedState = Partial<AgentsPersistedState> & {
  readonly version?: number;
};

type OrgRecord = { readonly organizationId?: string };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? [...(value as T[])] : [];
}

function byOrg<T extends OrgRecord>(
  items: readonly T[] | undefined,
  organizationId: string,
): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item.organizationId === organizationId);
}

export function emptyAgentsState(): AgentsPersistedState {
  return {
    version: 7,
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
    growthProfiles: [],
    growthStrategies: [],
    websiteProjects: [],
    socialAccounts: [],
    socialStrategies: [],
    socialCalendars: [],
    socialContent: [],
    publishingJobs: [],
    campaigns: [],
    growthInsights: [],
    executionJobs: [],
    executionAttempts: [],
    executionEvents: [],
    growthCrmLinks: [],
    campaignCrmSyncs: [],
    crmFollowUps: [],
    creativeProjects: [],
  };
}

export function normalizeState(
  state: LegacyAgentsPersistedState | null,
): AgentsPersistedState | null {
  if (!state) return null;
  return {
    version: 7,
    runtimes: asArray(state.runtimes),
    tasks: asArray(state.tasks),
    executions: asArray(state.executions),
    approvals: asArray(state.approvals),
    stepExecutions: asArray(state.stepExecutions),
    memories: asArray(state.memories),
    knowledge: asArray(state.knowledge),
    plans: asArray(state.plans),
    traces: asArray(state.traces),
    messages: asArray(state.messages),
    contexts: asArray(state.contexts),
    settings: asArray(state.settings),
    toolInvocationCount24h:
      typeof state.toolInvocationCount24h === "number"
        ? state.toolInvocationCount24h
        : 0,
    growthProfiles: asArray(state.growthProfiles),
    growthStrategies: asArray(state.growthStrategies),
    websiteProjects: asArray(state.websiteProjects),
    socialAccounts: asArray(state.socialAccounts),
    socialStrategies: asArray(state.socialStrategies),
    socialCalendars: asArray(state.socialCalendars),
    socialContent: asArray(state.socialContent),
    publishingJobs: asArray(state.publishingJobs),
    campaigns: asArray(state.campaigns),
    growthInsights: asArray(state.growthInsights),
    executionJobs: asArray(state.executionJobs),
    executionAttempts: asArray(state.executionAttempts),
    executionEvents: asArray(state.executionEvents),
    growthCrmLinks: asArray(state.growthCrmLinks),
    campaignCrmSyncs: asArray(state.campaignCrmSyncs),
    crmFollowUps: asArray(state.crmFollowUps),
    creativeProjects: asArray(state.creativeProjects),
  };
}

/**
 * Return a v7 snapshot containing only records belonging to organizationId.
 */
export function filterStateForOrganization(
  state: AgentsPersistedState | LegacyAgentsPersistedState | null | undefined,
  organizationId: string,
): AgentsPersistedState {
  const normalized = normalizeState(state ?? null) ?? emptyAgentsState();
  const tasks = byOrg(normalized.tasks, organizationId);
  const taskIds = new Set(tasks.map((t) => t.id));
  const runtimes = byOrg(normalized.runtimes, organizationId);
  const runtimeIds = new Set(runtimes.map((r) => r.instanceId));
  const executionJobs = byOrg(normalized.executionJobs, organizationId);
  const jobIds = new Set(executionJobs.map((j) => j.id));

  return {
    version: 7,
    runtimes,
    tasks,
    executions: byOrg(normalized.executions, organizationId),
    approvals: byOrg(normalized.approvals, organizationId),
    stepExecutions: byOrg(normalized.stepExecutions, organizationId),
    memories: byOrg(normalized.memories, organizationId),
    knowledge: byOrg(normalized.knowledge, organizationId),
    plans: byOrg(normalized.plans, organizationId),
    traces: normalized.traces.filter((t) => taskIds.has(t.taskId)),
    messages: normalized.messages.filter(
      (m) =>
        runtimeIds.has(m.fromInstanceId) || runtimeIds.has(m.toInstanceId),
    ),
    contexts: byOrg(normalized.contexts, organizationId),
    settings: byOrg(normalized.settings, organizationId),
    toolInvocationCount24h: normalized.toolInvocationCount24h,
    growthProfiles: byOrg(normalized.growthProfiles, organizationId),
    growthStrategies: byOrg(normalized.growthStrategies, organizationId),
    websiteProjects: byOrg(normalized.websiteProjects, organizationId),
    socialAccounts: byOrg(normalized.socialAccounts, organizationId),
    socialStrategies: byOrg(normalized.socialStrategies, organizationId),
    socialCalendars: byOrg(normalized.socialCalendars, organizationId),
    socialContent: byOrg(normalized.socialContent, organizationId),
    publishingJobs: byOrg(normalized.publishingJobs, organizationId),
    campaigns: byOrg(normalized.campaigns, organizationId),
    growthInsights: byOrg(normalized.growthInsights, organizationId),
    executionJobs,
    executionAttempts: normalized.executionAttempts.filter((a) =>
      jobIds.has(a.executionJobId),
    ),
    executionEvents: byOrg(normalized.executionEvents, organizationId),
    growthCrmLinks: byOrg(normalized.growthCrmLinks, organizationId),
    campaignCrmSyncs: byOrg(normalized.campaignCrmSyncs, organizationId),
    crmFollowUps: byOrg(normalized.crmFollowUps, organizationId),
    creativeProjects: byOrg(normalized.creativeProjects, organizationId),
  };
}

export function stateContainsForeignOrganization(
  state: AgentsPersistedState,
  organizationId: string,
): boolean {
  const arrays: readonly (readonly OrgRecord[])[] = [
    state.runtimes,
    state.tasks,
    state.executions,
    state.approvals,
    state.stepExecutions,
    state.memories,
    state.knowledge,
    state.plans,
    state.contexts,
    state.settings,
    state.growthProfiles,
    state.growthStrategies,
    state.websiteProjects,
    state.socialAccounts,
    state.socialStrategies,
    state.socialCalendars,
    state.socialContent,
    state.publishingJobs,
    state.campaigns,
    state.growthInsights,
    state.executionJobs,
    state.executionEvents,
    state.growthCrmLinks,
    state.campaignCrmSyncs,
    state.crmFollowUps,
    state.creativeProjects,
  ];
  return arrays.some((items) =>
    items.some(
      (item) =>
        typeof item.organizationId === "string" &&
        item.organizationId !== organizationId,
    ),
  );
}
