import { beforeEach, describe, expect, it } from "vitest";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { growthService } from "@/features/agents/growth/service";
import { normalizeState } from "@/features/agents/repositories";
import { planCampaign } from "@/features/agents/campaigns/planner";
import { evaluateCampaignReadiness } from "@/features/agents/campaigns/readiness";
import { buildGrowthInsights } from "@/features/agents/campaigns/insights";
import { getToolDefinition } from "@/features/agents/tools";

describe("Phase 44 growth campaign operations", () => {
  const organizationId = "org_phase44_test";

  beforeEach(() => {
    agentsStore.reset();
  });

  it("generates a campaign from an incomplete profile", async () => {
    const profile = growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "" },
    });
    expect(profile.companyName).toBe("");
    const campaign = await growthService.planCampaign(organizationId);
    expect(campaign.id).toMatch(/^camp_/);
    expect(campaign.status).toBe("READY_FOR_APPROVAL");
    expect(campaign.status).not.toBe("COMPLETED");
    expect(campaign.tasks.length).toBeGreaterThan(0);
    expect(campaign.milestones.length).toBeGreaterThan(0);
  });

  it("uses actual GrowthBusinessProfile data in the planner", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Harbor Fitness",
        services: ["personal training"],
        targetAudience: "busy professionals",
        uniqueSellingProposition: "Coach-led strength in 30 minutes",
        preferredPlatforms: ["instagram", "linkedin"],
      },
    });
    const campaign = await growthService.planCampaign(organizationId);
    expect(campaign.name).toContain("Harbor Fitness");
    expect(campaign.offer).toBe("personal training");
    expect(campaign.audience.description).toBe("busy professionals");
    expect(campaign.coreMessage).toBe("Coach-led strength in 30 minutes");
    expect(campaign.channels.some((channel) => channel.id === "INSTAGRAM" && channel.enabled)).toBe(
      true,
    );
  });

  it("references website and social Phase 43 outputs as campaign assets", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Northwind Cleaning",
        services: ["office cleaning"],
        preferredPlatforms: ["instagram"],
      },
    });
    const website = await growthService.generateWebsite(organizationId);
    const strategy = await growthService.generateSocialStrategy(organizationId);
    const calendar = await growthService.generateCalendar(organizationId);
    const content = await growthService.generateContent(organizationId);
    const campaign = await growthService.planCampaign(organizationId);
    expect(campaign.websiteProjectId).toBe(website.id);
    expect(campaign.socialStrategyId).toBe(strategy.id);
    expect(campaign.calendarId).toBe(calendar.id);
    expect(campaign.contentIds).toEqual(content.map((item) => item.id));
    expect(campaign.assets.some((asset) => asset.kind === "website" && asset.refId === website.id)).toBe(
      true,
    );
    expect(campaign.assets.some((asset) => asset.kind === "social_content")).toBe(true);
  });

  it("evaluates campaign readiness deterministically", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Ready Co", services: ["audit"] },
    });
    await growthService.planCampaign(organizationId);
    const first = await growthService.evaluateReadiness(organizationId);
    const second = await growthService.evaluateReadiness(organizationId);
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(first.ready).toBe(false);
  });

  it("adds a blocker when a required social account is disconnected", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Social Gap",
        services: ["brand"],
        preferredPlatforms: ["instagram"],
      },
    });
    const campaign = await growthService.planCampaign(organizationId);
    const readiness = evaluateCampaignReadiness({
      profile: growthService.getProfile(organizationId)!,
      campaign,
      accounts: growthService.listAccounts(organizationId),
    });
    expect(growthService.listAccounts(organizationId).every((item) => item.state === "DISCONNECTED")).toBe(
      true,
    );
    expect(readiness.blockers).toContain("social.disconnected");
    expect(readiness.ready).toBe(false);
  });

  it("adds a blocker when publishing integration is missing", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "No Publisher", services: ["ops"] },
    });
    await growthService.planCampaign(organizationId);
    const readiness = await growthService.evaluateReadiness(organizationId);
    expect(readiness.blockers).toContain("publishing.unavailable");
    expect(readiness.completedChecks).not.toContain("publishing.available");
    expect(readiness.ready).toBe(false);
  });

  it("does not mark a campaign completed without successful execution", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Draft Co", services: ["consulting"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    expect(campaign.status).not.toBe("COMPLETED");
    expect(campaign.executionResult).toBeUndefined();
  });

  it("requests campaign approval through existing AgentApproval", async () => {
    expect(getToolDefinition("campaign_plan")?.requiresApproval).toBeFalsy();
    expect(getToolDefinition("campaign_readiness")?.requiresApproval).toBeFalsy();
    expect(getToolDefinition("growth_insights")?.requiresApproval).toBeFalsy();
    expect(getToolDefinition("campaign_execute")?.requiresApproval).toBe(true);

    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Approval Co", services: ["legal"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    const attempt = await growthService.requestCampaignApproval(organizationId, campaign.id);
    expect(attempt.task.status).toBe("blocked");
    const approval = agentOsService.listApprovals(organizationId)[0];
    expect(approval?.state).toBe("REQUIRES_APPROVAL");
    expect(approval?.toolId).toBe("campaign_execute");
    expect(growthService.getCampaign(organizationId, campaign.id)?.status).not.toBe("COMPLETED");
  });

  it("blocks execution after a rejected AgentApproval", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Rejected Campaign", services: ["research"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "REJECTED",
      decidedBy: "tester",
    });
    const after = growthService.getCampaign(organizationId, campaign.id)!;
    expect(after.approvalState).toBe("REJECTED");
    expect(after.status).toBe("BLOCKED");
    expect(after.status).not.toBe("COMPLETED");
    await expect(
      growthService.requestCampaignApproval(organizationId, campaign.id),
    ).rejects.toThrow(/cannot be executed/i);
  });

  it("lets an approved campaign attempt execution", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Approved Campaign", services: ["growth"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const after = growthService.getCampaign(organizationId, campaign.id)!;
    expect(after.approvalState).toBe("APPROVED");
    expect(after.executionResult).toBeDefined();
    expect(after.status).not.toBe("COMPLETED");
  });

  it("never reports fake publishing success from an unavailable adapter", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Unavailable Adapter", services: ["support"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const after = growthService.getCampaign(organizationId, campaign.id)!;
    expect(after.executionResult?.available).toBe(false);
    expect(after.executionResult?.published).toBe(false);
    expect(after.executionResult?.status).toBe("unavailable");
    expect(after.status).toBe("BLOCKED");
    expect(after.status).not.toBe("COMPLETED");
  });

  it("builds deterministic growth insights from AGXORA data", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Insight Co",
        services: ["bookkeeping"],
        preferredPlatforms: ["instagram"],
      },
    });
    await growthService.generateWebsite(organizationId);
    await growthService.planCampaign(organizationId);
    const first = await growthService.generateInsights(organizationId);
    const second = await growthService.generateInsights(organizationId);
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(first.map((item) => item.code)).toEqual(second.map((item) => item.code));
    expect(first.some((item) => item.type === "PRIORITY")).toBe(true);
    expect(first.some((item) => item.code === "risk.publishing_unavailable")).toBe(true);
    expect(first.some((item) => item.code === "risk.disconnected")).toBe(true);
  });

  it("normalizes version 2 and version 3 persistence into version 4", () => {
    const fromV2 = normalizeState({
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
      toolInvocationCount24h: 2,
    });
    expect(fromV2?.version).toBe(4);
    expect(fromV2?.campaigns).toEqual([]);
    expect(fromV2?.growthInsights).toEqual([]);
    expect(fromV2?.growthProfiles).toEqual([]);

    const fromV3 = normalizeState({
      version: 3,
      growthProfiles: [],
      websiteProjects: [],
      socialAccounts: [],
      socialContent: [],
    });
    expect(fromV3?.version).toBe(4);
    expect(fromV3?.campaigns).toEqual([]);
    expect(fromV3?.growthInsights).toEqual([]);
    expect(fromV3?.socialCalendars).toEqual([]);
  });

  it("exposes campaign handlers through the existing /agents prefix", async () => {
    registerLocalDataHandlers();
    await localDataProvider.request({
      method: "POST",
      path: "/agents/growth/business-profile",
      body: {
        organizationId,
        companyName: "API Campaigns",
        services: ["windows"],
      },
    });
    const planned = await localDataProvider.request<{
      readonly id: string;
      readonly status: string;
      readonly offer: string;
    }>({
      method: "POST",
      path: "/agents/growth/campaigns/plan",
      body: { organizationId },
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.data.offer).toBe("windows");
    expect(planned.data.status).not.toBe("COMPLETED");

    const readiness = await localDataProvider.request<{
      readonly ready: boolean;
      readonly blockers: readonly string[];
    }>({
      method: "POST",
      path: "/agents/growth/campaigns/readiness",
      body: { organizationId },
    });
    expect(readiness.ok).toBe(true);
    if (!readiness.ok) return;
    expect(readiness.data.ready).toBe(false);
    expect(readiness.data.blockers).toContain("publishing.unavailable");
  });

  it("keeps planner output aligned with an incomplete profile object", () => {
    const profile = growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "" },
    });
    const campaign = planCampaign({ profile });
    expect(campaign.offer).toBe("core service");
    expect(campaign.audience.description).toBe("local customers");
    expect(campaign.channels.some((channel) => channel.id === "WEBSITE" && channel.enabled)).toBe(
      true,
    );
    const insights = buildGrowthInsights({
      organizationId,
      profile,
      campaign,
      accounts: [],
    });
    expect(insights.some((item) => item.code === "action.review_approve")).toBe(true);
  });
});
