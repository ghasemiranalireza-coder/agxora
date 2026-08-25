/**
 * Agent OS repository — LocalStorage now, REST later.
 */

import type { CampaignCrmSync, GrowthCrmLink } from "../crm/types";
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

export interface AgentsPersistedState {
  readonly version: 6;
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
}

export type LegacyAgentsPersistedState = Partial<AgentsPersistedState> & {
  readonly version?: number;
};

export interface AgentsRepository {
  load(): AgentsPersistedState | null;
  save(state: AgentsPersistedState): void;
}

const STORAGE_KEY = "agxora-agent-os-v1";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? [...(value as T[])] : [];
}

export function normalizeState(
  state: LegacyAgentsPersistedState | null,
): AgentsPersistedState | null {
  if (!state) return null;
  return {
    version: 6,
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
  };
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
    version: 6,
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
  };
}
