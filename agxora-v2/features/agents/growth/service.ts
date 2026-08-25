/**
 * Growth orchestration — calls Agent OS rather than a second execution engine.
 */

import { auditLog } from "@/app/lib/backend/audit/logger";
import { businessBrain } from "@/app/lib/business/BusinessBrain";
import { agentOsService } from "../services/agentOsService";
import { agentsStore } from "../store";
import type { AgentApproval, AgentId, ToolId } from "../types";
import { createGrowthId, nowIso } from "./ids";
import {
  createGrowthProfile,
  seedGrowthDraftFromBusinessProfile,
} from "./profile";
import { buildGrowthStrategy } from "./strategy";
import type {
  GrowthBusinessProfile,
  GrowthProfileDraft,
  GrowthStrategy,
  SocialPlatformId,
} from "./types";
import { SOCIAL_PLATFORMS } from "./types";
import type { SocialAccount } from "../social/types";
import type { WebsiteProject } from "../website/types";
import { evaluateCampaignReadiness } from "../campaigns/readiness";
import {
  getCrmFollowUp,
  getCrmLinkedLeadState,
  listCrmFollowUps,
} from "../crm/followUp";
import { buildLeadActionQueue } from "../crm/prioritize";
import { getCampaignCrmSync, getGrowthCrmLink } from "../crm/sync";
import type { CrmFollowUpKind } from "../crm/types";
import { operationsService } from "../execution/service";
import {
  CAMPAIGN_CHANNELS,
  type Campaign,
  type CampaignChannelId,
  type CampaignReadiness,
  type GrowthInsight,
} from "../campaigns/types";

function orgFilter<T extends { organizationId: string }>(
  items: readonly T[],
  organizationId: string,
): T[] {
  return items.filter((item) => item.organizationId === organizationId);
}

function runtimeFor(organizationId: string, agentId: AgentId) {
  agentOsService.ensureWorkspace(organizationId);
  const existing = agentOsService
    .listRuntimes(organizationId)
    .find((item) => item.agentId === agentId);
  if (existing) {
    if (existing.status !== "active") {
      return agentOsService.setStatus(existing.instanceId, "active");
    }
    return existing;
  }
  return agentOsService.register(organizationId, agentId, true);
}

function auditGrowth(
  action: string,
  organizationId: string,
  resourceId: string,
  metadata?: Readonly<Record<string, string>>,
): void {
  auditLog({
    action,
    resource: "agent_growth",
    resourceId,
    organizationId,
    metadata,
  });
}

function disconnectedAccounts(
  organizationId: string,
  platforms: readonly SocialPlatformId[],
): readonly SocialAccount[] {
  const now = nowIso();
  const existing = orgFilter(agentsStore.getSnapshot().socialAccounts, organizationId);
  return platforms.map((platform) => {
    const prior = existing.find((item) => item.platform === platform);
    return (
      prior ?? {
        id: createGrowthId("sacc"),
        organizationId,
        platform,
        state: "DISCONNECTED",
        createdAt: now,
        updatedAt: now,
      }
    );
  });
}

async function runAgentTool(input: {
  readonly organizationId: string;
  readonly agentId: AgentId;
  readonly toolId: ToolId;
  readonly title: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}) {
  const runtime = runtimeFor(input.organizationId, input.agentId);
  return agentOsService.enqueueTask({
    organizationId: input.organizationId,
    agentInstanceId: runtime.instanceId,
    title: input.title,
    goal: input.title,
    toolId: input.toolId,
    payload: input.payload,
  });
}

function latestProfile(organizationId: string): GrowthBusinessProfile | undefined {
  return orgFilter(agentsStore.getSnapshot().growthProfiles, organizationId)[0];
}

export const growthService = {
  ensure(organizationId: string): void {
    agentOsService.ensureWorkspace(organizationId);
    runtimeFor(organizationId, "website_builder");
    runtimeFor(organizationId, "social_media");
    runtimeFor(organizationId, "growth_campaign");
    runtimeFor(organizationId, "crm_assistant");
    for (const account of disconnectedAccounts(organizationId, SOCIAL_PLATFORMS)) {
      agentsStore.upsertSocialAccount(account);
    }
  },

  getProfile(organizationId: string): GrowthBusinessProfile | undefined {
    this.ensure(organizationId);
    return latestProfile(organizationId);
  },

  saveProfile(input: {
    readonly organizationId: string;
    readonly draft?: GrowthProfileDraft;
    readonly seedFromBusinessOs?: boolean;
  }): GrowthBusinessProfile {
    this.ensure(input.organizationId);
    const existing = latestProfile(input.organizationId);
    const seeded =
      input.seedFromBusinessOs === false
        ? {}
        : seedGrowthDraftFromBusinessProfile(
            businessBrain.getProfile(input.organizationId),
          );
    const profile = createGrowthProfile({
      organizationId: input.organizationId,
      existing,
      draft: { ...seeded, ...(input.draft ?? {}) },
      seededFromOrgId: seeded.companyName ? input.organizationId : undefined,
    });
    agentsStore.upsertGrowthProfile(profile);
    for (const account of disconnectedAccounts(
      input.organizationId,
      profile.preferredPlatforms.length > 0
        ? profile.preferredPlatforms
        : SOCIAL_PLATFORMS,
    )) {
      agentsStore.upsertSocialAccount(account);
    }
    auditGrowth("agent.growth.profile_created", input.organizationId, profile.id, {
      companyName: profile.companyName || "incomplete",
    });
    return profile;
  },

  generateStrategy(organizationId: string): GrowthStrategy {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    const strategy = buildGrowthStrategy(profile);
    agentsStore.upsertGrowthStrategy(strategy);
    auditGrowth("agent.growth.strategy_generated", organizationId, strategy.id, {
      profileId: profile.id,
    });
    return strategy;
  },

  async generateWebsite(organizationId: string): Promise<WebsiteProject> {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    const existing = orgFilter(
      agentsStore.getSnapshot().websiteProjects,
      organizationId,
    )[0];
    const projectId = existing?.id ?? createGrowthId("wproj");
    agentsStore.upsertWebsiteProject({
      id: projectId,
      organizationId,
      profileId: profile.id,
      status: "GENERATING",
      name: profile.companyName.trim() || "Website preview",
      navigation: [],
      pages: [],
      metadata: { title: profile.companyName.trim() || "Website preview", description: "" },
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    const task = await runAgentTool({
      organizationId,
      agentId: "website_builder",
      toolId: "website",
      title: "Generate website preview",
      payload: { profileId: profile.id, projectId, growthAction: "generate" },
    });
    const project = orgFilter(
      agentsStore.getSnapshot().websiteProjects,
      organizationId,
    ).find((item) => item.id === projectId);
    if (!project) throw new Error("Website generation did not persist a project");
    const next = {
      ...project,
      taskId: task.id,
      executionId: task.executionId,
    };
    agentsStore.upsertWebsiteProject(next);
    auditGrowth("agent.growth.website_plan_generated", organizationId, next.id, {
      status: next.status,
    });
    auditGrowth("agent.growth.website_preview_generated", organizationId, next.id, {
      pages: String(next.pages.length),
    });
    return next;
  },

  async generateSocialStrategy(organizationId: string) {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    await runAgentTool({
      organizationId,
      agentId: "social_media",
      toolId: "social",
      title: "Generate social strategy",
      payload: { profileId: profile.id, growthAction: "strategy" },
    });
    const strategy = orgFilter(
      agentsStore.getSnapshot().socialStrategies,
      organizationId,
    )[0];
    if (!strategy) throw new Error("Social strategy generation failed");
    auditGrowth("agent.growth.social_strategy_generated", organizationId, strategy.id);
    return strategy;
  },

  async generateCalendar(organizationId: string) {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    if (!orgFilter(agentsStore.getSnapshot().socialStrategies, organizationId)[0]) {
      await this.generateSocialStrategy(organizationId);
    }
    await runAgentTool({
      organizationId,
      agentId: "social_media",
      toolId: "social",
      title: "Generate social calendar",
      payload: { profileId: profile.id, growthAction: "calendar" },
    });
    const calendar = orgFilter(
      agentsStore.getSnapshot().socialCalendars,
      organizationId,
    )[0];
    if (!calendar) throw new Error("Social calendar generation failed");
    auditGrowth("agent.growth.calendar_generated", organizationId, calendar.id, {
      entries: String(calendar.entries.length),
    });
    return calendar;
  },

  async generateContent(organizationId: string) {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    if (!orgFilter(agentsStore.getSnapshot().socialCalendars, organizationId)[0]) {
      await this.generateCalendar(organizationId);
    }
    await runAgentTool({
      organizationId,
      agentId: "social_media",
      toolId: "social",
      title: "Generate social content",
      payload: { profileId: profile.id, growthAction: "content" },
    });
    const items = orgFilter(agentsStore.getSnapshot().socialContent, organizationId);
    auditGrowth("agent.growth.content_generated", organizationId, profile.id, {
      count: String(items.length),
    });
    return items;
  },

  async requestWebsitePublish(organizationId: string) {
    this.ensure(organizationId);
    const project = orgFilter(
      agentsStore.getSnapshot().websiteProjects,
      organizationId,
    )[0];
    if (!project) throw new Error("Website project not found");
    if (project.approvalState === "REJECTED" || project.status === "NEEDS_CHANGES") {
      throw new Error("Rejected website projects cannot be published.");
    }
    agentsStore.upsertWebsiteProject({
      ...project,
      status: project.status === "PREVIEW" ? "READY" : project.status,
      updatedAt: nowIso(),
    });
    const task = await runAgentTool({
      organizationId,
      agentId: "website_builder",
      toolId: "website_publish",
      title: "Publish website",
      payload: { projectId: project.id, growthAction: "publish" },
    });
    if (task.status === "blocked") {
      auditGrowth("agent.growth.approval_requested", organizationId, project.id, {
        toolId: "website_publish",
      });
    }
    auditGrowth("agent.growth.publish_attempted", organizationId, project.id, {
      taskStatus: task.status,
    });
    return {
      task,
      project: orgFilter(agentsStore.getSnapshot().websiteProjects, organizationId)[0]!,
    };
  },

  async requestSocialPublish(
    organizationId: string,
    contentId?: string,
    action: "publish" | "schedule" = "publish",
  ) {
    this.ensure(organizationId);
    const item = orgFilter(agentsStore.getSnapshot().socialContent, organizationId).find(
      (row) => (contentId ? row.id === contentId : true),
    );
    if (!item) throw new Error("Social content not found");
    if (
      item.approvalState === "REJECTED" ||
      item.status === "REJECTED" ||
      item.status === "BLOCKED"
    ) {
      throw new Error("Rejected social content cannot be published.");
    }
    const toolId: ToolId = action === "schedule" ? "social_schedule" : "social_publish";
    const task = await runAgentTool({
      organizationId,
      agentId: "social_media",
      toolId,
      title: action === "schedule" ? "Schedule social content" : "Publish social content",
      payload: { contentId: item.id, growthAction: action },
    });
    if (task.status === "blocked") {
      auditGrowth("agent.growth.approval_requested", organizationId, item.id, {
        toolId,
      });
    }
    auditGrowth("agent.growth.publish_attempted", organizationId, item.id, {
      taskStatus: task.status,
      action,
    });
    return {
      task,
      content: orgFilter(agentsStore.getSnapshot().socialContent, organizationId).find(
        (row) => row.id === item.id,
      )!,
    };
  },

  async resolveApproval(input: {
    readonly approvalId: string;
    readonly state: "APPROVED" | "REJECTED";
    readonly decidedBy?: string;
    readonly comment?: string;
  }): Promise<AgentApproval> {
    const pending = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === input.approvalId);
    const task = pending
      ? agentsStore.getSnapshot().tasks.find((item) => item.id === pending.taskId)
      : undefined;
    if (pending && task) {
      this.syncDomainAfterApproval(
        { ...pending, state: input.state },
        task.input,
        { preservePublishResult: false },
      );
    }
    const approval = await agentOsService.resolveApproval(input);
    auditGrowth(
      input.state === "APPROVED"
        ? "agent.growth.approval_approved"
        : "agent.growth.approval_rejected",
      approval.organizationId,
      approval.id,
    );
    if (input.state === "REJECTED" && task) {
      this.syncDomainAfterApproval(approval, task.input, { preservePublishResult: true });
    }
    operationsService.syncFromApproval(approval, input.decidedBy ?? "operator");
    return approval;
  },

  syncDomainAfterApproval(
    approval: AgentApproval,
    taskInput: Readonly<Record<string, unknown>>,
    options?: { readonly preservePublishResult?: boolean },
  ): void {
    void options;
    const projectId =
      typeof taskInput.projectId === "string" ? taskInput.projectId : undefined;
    const contentId =
      typeof taskInput.contentId === "string" ? taskInput.contentId : undefined;
    if (projectId) {
      const project = agentsStore
        .getSnapshot()
        .websiteProjects.find((item) => item.id === projectId);
      if (project) {
        agentsStore.upsertWebsiteProject({
          ...project,
          approvalState: approval.state,
          status:
            approval.state === "REJECTED"
              ? "NEEDS_CHANGES"
              : project.status === "PUBLISHED"
                ? "PUBLISHED"
                : "APPROVED",
          updatedAt: nowIso(),
        });
      }
    }
    if (contentId) {
      const content = agentsStore
        .getSnapshot()
        .socialContent.find((item) => item.id === contentId);
      if (content) {
        agentsStore.upsertSocialContent({
          ...content,
          approvalState: approval.state,
          status:
            approval.state === "REJECTED"
              ? "BLOCKED"
              : content.status === "PUBLISHED"
                ? "PUBLISHED"
                : "APPROVED",
          updatedAt: nowIso(),
        });
      }
    }
    const campaignId =
      typeof taskInput.campaignId === "string" ? taskInput.campaignId : undefined;
    if (campaignId) {
      const campaign = agentsStore
        .getSnapshot()
        .campaigns.find((item) => item.id === campaignId);
      if (campaign) {
        agentsStore.upsertCampaign({
          ...campaign,
          approvalState: approval.state,
          status:
            approval.state === "REJECTED"
              ? "BLOCKED"
              : campaign.status === "COMPLETED"
                ? "COMPLETED"
                : campaign.status === "BLOCKED" || campaign.status === "FAILED"
                  ? campaign.status
                  : "APPROVED",
          updatedAt: nowIso(),
        });
      }
    }
  },

  listWebsiteProjects(organizationId: string): readonly WebsiteProject[] {
    return orgFilter(agentsStore.getSnapshot().websiteProjects, organizationId);
  },

  getWebsiteProject(organizationId: string, projectId: string): WebsiteProject | undefined {
    return this.listWebsiteProjects(organizationId).find((item) => item.id === projectId);
  },

  listSocialStrategy(organizationId: string) {
    return orgFilter(agentsStore.getSnapshot().socialStrategies, organizationId)[0];
  },

  listCalendars(organizationId: string) {
    return orgFilter(agentsStore.getSnapshot().socialCalendars, organizationId);
  },

  listContent(organizationId: string) {
    return orgFilter(agentsStore.getSnapshot().socialContent, organizationId);
  },

  listAccounts(organizationId: string) {
    return orgFilter(agentsStore.getSnapshot().socialAccounts, organizationId);
  },

  listGrowthStrategies(organizationId: string) {
    return orgFilter(agentsStore.getSnapshot().growthStrategies, organizationId);
  },

  listCampaigns(organizationId: string): readonly Campaign[] {
    return orgFilter(agentsStore.getSnapshot().campaigns, organizationId);
  },

  getCampaign(organizationId: string, campaignId: string): Campaign | undefined {
    return this.listCampaigns(organizationId).find((item) => item.id === campaignId);
  },

  async planCampaign(
    organizationId: string,
    request?: {
      readonly objective?: string;
      readonly audience?: string;
      readonly offer?: string;
      readonly channels?: readonly string[];
    },
  ): Promise<Campaign> {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    const existing = this.listCampaigns(organizationId)[0];
    const channels = request?.channels?.filter((item): item is CampaignChannelId =>
      CAMPAIGN_CHANNELS.includes(item as CampaignChannelId),
    );
    await runAgentTool({
      organizationId,
      agentId: "growth_campaign",
      toolId: "campaign_plan",
      title: "Plan growth campaign",
      payload: {
        profileId: profile.id,
        campaignId: existing?.id,
        objective: request?.objective,
        audience: request?.audience,
        offer: request?.offer,
        channels,
      },
    });
    const campaign = this.listCampaigns(organizationId)[0];
    if (!campaign) throw new Error("Campaign planning did not persist a campaign");
    auditGrowth("agent.growth.campaign_planned", organizationId, campaign.id, {
      offer: campaign.offer,
    });
    return campaign;
  },

  async evaluateReadiness(organizationId: string): Promise<CampaignReadiness> {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    await runAgentTool({
      organizationId,
      agentId: "growth_campaign",
      toolId: "campaign_readiness",
      title: "Evaluate campaign readiness",
      payload: { campaignId: this.listCampaigns(organizationId)[0]?.id },
    });
    return evaluateCampaignReadiness({
      profile,
      campaign: this.listCampaigns(organizationId)[0],
      accounts: this.listAccounts(organizationId),
      website: this.listWebsiteProjects(organizationId)[0],
    });
  },

  async generateInsights(organizationId: string): Promise<readonly GrowthInsight[]> {
    this.ensure(organizationId);
    if (!latestProfile(organizationId)) {
      this.saveProfile({ organizationId, draft: {} });
    }
    await runAgentTool({
      organizationId,
      agentId: "growth_campaign",
      toolId: "growth_insights",
      title: "Generate growth insights",
      payload: { campaignId: this.listCampaigns(organizationId)[0]?.id },
    });
    const insights = orgFilter(
      agentsStore.getSnapshot().growthInsights,
      organizationId,
    );
    auditGrowth("agent.growth.insights_generated", organizationId, organizationId, {
      count: String(insights.length),
    });
    return insights;
  },

  async requestCampaignApproval(organizationId: string, campaignId?: string) {
    this.ensure(organizationId);
    const campaign = campaignId
      ? this.getCampaign(organizationId, campaignId)
      : this.listCampaigns(organizationId)[0];
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.approvalState === "REJECTED") {
      throw new Error("Rejected campaigns cannot be executed.");
    }
    agentsStore.upsertCampaign({
      ...campaign,
      status: "READY_FOR_APPROVAL",
      updatedAt: nowIso(),
    });
    const task = await runAgentTool({
      organizationId,
      agentId: "growth_campaign",
      toolId: "campaign_execute",
      title: "Execute growth campaign",
      payload: { campaignId: campaign.id, growthAction: "execute" },
    });
    operationsService.observeAgentTask({
      organizationId,
      task,
      toolId: "campaign_execute",
      campaignId: campaign.id,
      title: "Execute growth campaign",
      actor: "system",
      priority: "HIGH",
    });
    if (task.status === "blocked") {
      auditGrowth("agent.growth.approval_requested", organizationId, campaign.id, {
        toolId: "campaign_execute",
      });
    }
    return {
      task,
      campaign: this.getCampaign(organizationId, campaign.id)!,
    };
  },

  async requestCrmSync(
    organizationId: string,
    campaignId?: string,
  ): Promise<{
    readonly task: Awaited<ReturnType<typeof runAgentTool>>;
    readonly job: ReturnType<typeof operationsService.enqueue>;
    readonly link: ReturnType<typeof getGrowthCrmLink>;
    readonly sync: ReturnType<typeof getCampaignCrmSync>;
  }> {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    const campaign = campaignId
      ? this.getCampaign(organizationId, campaignId)
      : this.listCampaigns(organizationId)[0];
    const campaignTaskId = campaign?.tasks.find(
      (task) => task.code === "sync_crm_customer",
    )?.id;
    const job = operationsService.enqueue({
      organizationId,
      toolId: "crm",
      agentId: "crm_assistant",
      campaignId: campaign?.id,
      campaignTaskId,
      title: "Sync growth profile to CRM",
      priority: "HIGH",
      params: {
        action: "sync",
        profileId: profile.id,
        campaignId: campaign?.id,
        attachNote: true,
        growthAction: "crm_sync",
      },
    });
    const started = await operationsService.start(organizationId, job.id);
    if (started.status === "WAITING_FOR_APPROVAL") {
      auditGrowth("agent.growth.crm_sync_approval_requested", organizationId, profile.id, {
        jobId: started.id,
      });
    }
    return {
      task: agentsStore
        .getSnapshot()
        .tasks.find((item) => item.id === started.taskId)!,
      job: operationsService.get(organizationId, started.id)!,
      link: getGrowthCrmLink(organizationId, profile.id),
      sync: campaign
        ? getCampaignCrmSync(organizationId, campaign.id)
        : undefined,
    };
  },

  getCrmLink(organizationId: string) {
    const profile = latestProfile(organizationId);
    return getGrowthCrmLink(organizationId, profile?.id);
  },

  getCrmSync(organizationId: string, campaignId?: string) {
    return getCampaignCrmSync(organizationId, campaignId);
  },

  async requestCrmFollowUp(
    organizationId: string,
    input?: {
      readonly campaignId?: string;
      readonly kind?: CrmFollowUpKind;
      readonly title?: string;
      readonly summary?: string;
      readonly dueAt?: string;
    },
  ): Promise<{
    readonly task: Awaited<ReturnType<typeof runAgentTool>>;
    readonly job: ReturnType<typeof operationsService.enqueue>;
    readonly link: ReturnType<typeof getGrowthCrmLink>;
    readonly lead: ReturnType<typeof getCrmLinkedLeadState>;
  }> {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    const campaign = input?.campaignId
      ? this.getCampaign(organizationId, input.campaignId)
      : this.listCampaigns(organizationId)[0];
    const campaignTaskId = campaign?.tasks.find(
      (task) => task.code === "schedule_crm_follow_up",
    )?.id;
    const job = operationsService.enqueue({
      organizationId,
      toolId: "crm",
      agentId: "crm_assistant",
      campaignId: campaign?.id,
      campaignTaskId,
      title: "Create CRM follow-up for growth lead",
      priority: "HIGH",
      params: {
        action: "create_follow_up",
        profileId: profile.id,
        campaignId: campaign?.id,
        kind: input?.kind ?? "general",
        title: input?.title,
        summary: input?.summary,
        dueAt: input?.dueAt,
        growthAction: "crm_follow_up",
      },
    });
    const started = await operationsService.start(organizationId, job.id);
    if (started.status === "WAITING_FOR_APPROVAL") {
      auditGrowth(
        "agent.growth.crm_follow_up_approval_requested",
        organizationId,
        profile.id,
        { jobId: started.id },
      );
    }
    return {
      task: agentsStore
        .getSnapshot()
        .tasks.find((item) => item.id === started.taskId)!,
      job: operationsService.get(organizationId, started.id)!,
      link: getGrowthCrmLink(organizationId, profile.id),
      lead: getCrmLinkedLeadState(organizationId, profile.id),
    };
  },

  async requestCrmFollowUpComplete(
    organizationId: string,
    input: {
      readonly followUpId: string;
      readonly completionNote?: string;
      readonly campaignId?: string;
    },
  ): Promise<{
    readonly task: Awaited<ReturnType<typeof runAgentTool>>;
    readonly job: ReturnType<typeof operationsService.enqueue>;
    readonly followUp: ReturnType<typeof getCrmFollowUp>;
    readonly lead: ReturnType<typeof getCrmLinkedLeadState>;
  }> {
    this.ensure(organizationId);
    const profile =
      latestProfile(organizationId) ??
      this.saveProfile({ organizationId, draft: {} });
    const existing = getCrmFollowUp(organizationId, input.followUpId);
    const campaign = input.campaignId
      ? this.getCampaign(organizationId, input.campaignId)
      : existing?.campaignId
        ? this.getCampaign(organizationId, existing.campaignId)
        : this.listCampaigns(organizationId)[0];
    const job = operationsService.enqueue({
      organizationId,
      toolId: "crm",
      agentId: "crm_assistant",
      campaignId: campaign?.id ?? existing?.campaignId,
      title: "Complete CRM follow-up for growth lead",
      priority: "HIGH",
      params: {
        action: "complete_follow_up",
        profileId: profile.id,
        followUpId: input.followUpId,
        completionNote: input.completionNote,
        campaignId: campaign?.id ?? existing?.campaignId,
        growthAction: "crm_follow_up_complete",
      },
    });
    const started = await operationsService.start(organizationId, job.id);
    if (started.status === "WAITING_FOR_APPROVAL") {
      auditGrowth(
        "agent.growth.crm_follow_up_complete_approval_requested",
        organizationId,
        input.followUpId,
        { jobId: started.id },
      );
    }
    return {
      task: agentsStore
        .getSnapshot()
        .tasks.find((item) => item.id === started.taskId)!,
      job: operationsService.get(organizationId, started.id)!,
      followUp: getCrmFollowUp(organizationId, input.followUpId),
      lead: getCrmLinkedLeadState(organizationId, profile.id),
    };
  },

  listCrmFollowUps(
    organizationId: string,
    options?: {
      readonly customerId?: string;
      readonly campaignId?: string;
    },
  ) {
    return listCrmFollowUps(organizationId, options);
  },

  getCrmFollowUp(organizationId: string, followUpId: string) {
    return getCrmFollowUp(organizationId, followUpId);
  },

  getCrmLinkedLead(organizationId: string) {
    const profile = latestProfile(organizationId);
    return getCrmLinkedLeadState(organizationId, profile?.id);
  },

  /** Read-only Phase 49 lead prioritization queue — never mutates CRM. */
  getLeadActionQueue(organizationId: string) {
    this.ensure(organizationId);
    return buildLeadActionQueue(organizationId);
  },

  snapshot(organizationId: string) {
    this.ensure(organizationId);
    const profile = this.getProfile(organizationId) ?? null;
    const campaigns = this.listCampaigns(organizationId);
    return {
      profile,
      growthStrategy: this.listGrowthStrategies(organizationId)[0] ?? null,
      websiteProjects: this.listWebsiteProjects(organizationId),
      socialStrategy: this.listSocialStrategy(organizationId) ?? null,
      calendars: this.listCalendars(organizationId),
      content: this.listContent(organizationId),
      accounts: this.listAccounts(organizationId),
      publishingJobs: orgFilter(
        agentsStore.getSnapshot().publishingJobs,
        organizationId,
      ),
      approvals: agentOsService.listApprovals(organizationId),
      executions: agentOsService.listExecutions(organizationId),
      audit: agentOsService.listStepExecutions(organizationId),
      campaigns,
      insights: orgFilter(agentsStore.getSnapshot().growthInsights, organizationId),
      crmLink: getGrowthCrmLink(organizationId, profile?.id ?? undefined) ?? null,
      crmSync: getCampaignCrmSync(organizationId, campaigns[0]?.id) ?? null,
      crmLead: getCrmLinkedLeadState(organizationId, profile?.id ?? undefined),
      crmFollowUps: listCrmFollowUps(organizationId, {
        campaignId: campaigns[0]?.id,
      }),
      leadActionQueue: buildLeadActionQueue(organizationId),
    };
  },
};
