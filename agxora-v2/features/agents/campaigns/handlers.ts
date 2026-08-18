import { agentsStore } from "../store";
import type { SocialPlatformId } from "../growth/types";
import type { SocialContentItem } from "../social/types";
import { getSocialAdapter } from "../social/adapters";
import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import { getWebsitePublisher } from "../website/publisher";
import { planCampaign } from "./planner";
import { evaluateCampaignReadiness } from "./readiness";
import { buildGrowthInsights } from "./insights";
import type {
  Campaign,
  CampaignChannelId,
  CampaignPlanInput,
} from "./types";
import { CAMPAIGN_CHANNELS, isSocialCampaignChannel } from "./types";

function readString(params: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function orgItems<T extends { organizationId: string }>(
  items: readonly T[],
  organizationId: string,
): T[] {
  return items.filter((item) => item.organizationId === organizationId);
}

function latestProfile(organizationId: string, profileId?: string) {
  const profiles = orgItems(agentsStore.getSnapshot().growthProfiles, organizationId);
  if (profileId) return profiles.find((item) => item.id === profileId);
  return profiles[0];
}

function parseChannels(params: Readonly<Record<string, unknown>>): CampaignChannelId[] | undefined {
  const raw = params.channels;
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((item): item is CampaignChannelId =>
    typeof item === "string" && CAMPAIGN_CHANNELS.includes(item as CampaignChannelId),
  );
}

function findCampaign(organizationId: string, campaignId?: string): Campaign | undefined {
  const campaigns = orgItems(agentsStore.getSnapshot().campaigns, organizationId);
  if (campaignId) return campaigns.find((item) => item.id === campaignId);
  return campaigns[0];
}

function campaignContext(organizationId: string, profileId?: string, campaignId?: string) {
  const snap = agentsStore.getSnapshot();
  return {
    profile: latestProfile(organizationId, profileId),
    website: orgItems(snap.websiteProjects, organizationId)[0],
    strategy: orgItems(snap.growthStrategies, organizationId)[0],
    socialStrategy: orgItems(snap.socialStrategies, organizationId)[0],
    calendar: orgItems(snap.socialCalendars, organizationId)[0],
    content: orgItems(snap.socialContent, organizationId),
    accounts: orgItems(snap.socialAccounts, organizationId),
    campaign: findCampaign(organizationId, campaignId),
  };
}

function channelPlatform(id: Exclude<CampaignChannelId, "WEBSITE">): SocialPlatformId {
  return id.toLowerCase() as SocialPlatformId;
}

function adapterSucceeded(result: {
  readonly available: boolean;
  readonly published: boolean;
  readonly status: string;
}): boolean {
  return result.available === true && result.published === true && result.status === "published";
}

export async function handleCampaignPlanTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const context = campaignContext(
    ctx.organizationId,
    readString(ctx.params, "profileId"),
  );
  if (!context.profile) {
    return {
      ok: false,
      error: "Growth profile is required before campaign planning.",
      durationMs: Date.now() - started,
    };
  }
  const request: CampaignPlanInput = {
    organizationId: ctx.organizationId,
    objective: readString(ctx.params, "objective"),
    audience: readString(ctx.params, "audience"),
    offer: readString(ctx.params, "offer"),
    channels: parseChannels(ctx.params),
  };
  const campaign = planCampaign({
    profile: context.profile,
    strategy: context.strategy,
    website: context.website,
    socialStrategy: context.socialStrategy,
    calendar: context.calendar,
    content: context.content,
    request,
    campaignId: readString(ctx.params, "campaignId"),
  });
  agentsStore.upsertCampaign({
    ...campaign,
    taskId: ctx.taskId,
  });
  return {
    ok: true,
    output: {
      campaignId: campaign.id,
      status: campaign.status,
      offer: campaign.offer,
      completed: false,
    },
    durationMs: Date.now() - started,
  };
}

export async function handleCampaignReadinessTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const context = campaignContext(
    ctx.organizationId,
    undefined,
    readString(ctx.params, "campaignId"),
  );
  if (!context.profile) {
    return {
      ok: false,
      error: "Growth profile is required before readiness evaluation.",
      durationMs: Date.now() - started,
    };
  }
  const readiness = evaluateCampaignReadiness({
    profile: context.profile,
    campaign: context.campaign,
    accounts: context.accounts,
    website: context.website,
  });
  return {
    ok: true,
    output: readiness,
    durationMs: Date.now() - started,
  };
}

export async function handleGrowthInsightsTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const context = campaignContext(
    ctx.organizationId,
    undefined,
    readString(ctx.params, "campaignId"),
  );
  if (!context.profile) {
    return {
      ok: false,
      error: "Growth profile is required before insight generation.",
      durationMs: Date.now() - started,
    };
  }
  const insights = buildGrowthInsights({
    organizationId: ctx.organizationId,
    profile: context.profile,
    campaign: context.campaign,
    accounts: context.accounts,
  });
  agentsStore.replaceGrowthInsights(ctx.organizationId, insights);
  return {
    ok: true,
    output: { count: insights.length, codes: insights.map((item) => item.code) },
    durationMs: Date.now() - started,
  };
}

export async function handleCampaignExecuteTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const campaign = findCampaign(ctx.organizationId, readString(ctx.params, "campaignId"));
  if (!campaign) {
    return {
      ok: false,
      error: "Campaign not found.",
      durationMs: Date.now() - started,
    };
  }
  if (campaign.approvalState === "REJECTED" || campaign.status === "CANCELLED") {
    const blocked: Campaign = {
      ...campaign,
      status: "BLOCKED",
      approvalState: "REJECTED",
      taskId: ctx.taskId,
      updatedAt: new Date().toISOString(),
    };
    agentsStore.upsertCampaign(blocked);
    return {
      ok: false,
      error: "Rejected campaigns cannot be executed.",
      durationMs: Date.now() - started,
    };
  }

  const snap = agentsStore.getSnapshot();
  const website = campaign.websiteProjectId
    ? snap.websiteProjects.find((item) => item.id === campaign.websiteProjectId)
    : undefined;
  const websiteEnabled = campaign.channels.some(
    (channel) => channel.enabled && channel.id === "WEBSITE",
  );
  const websiteResult =
    websiteEnabled && website
      ? await getWebsitePublisher().publish(website)
      : { available: false, published: false, status: "unavailable" as const };

  const socialChannels = campaign.channels.filter(
    (channel) => channel.enabled && isSocialCampaignChannel(channel.id),
  );
  const socialResults = [];
  for (const channel of socialChannels) {
    if (!isSocialCampaignChannel(channel.id)) continue;
    const platform = channelPlatform(channel.id);
    const existing = snap.socialContent.find(
      (item) =>
        item.organizationId === campaign.organizationId &&
        (campaign.contentIds.includes(item.id) || item.platform === platform),
    );
    const payload: SocialContentItem = existing ?? {
      id: campaign.contentIds[0] ?? campaign.id,
      organizationId: campaign.organizationId,
      profileId: campaign.businessProfileId,
      platform,
      contentType: "POST",
      title: campaign.name,
      topic: campaign.offer,
      caption: campaign.coreMessage,
      cta: campaign.websiteCta,
      hashtags: [],
      visualDirection: "professional",
      status: "DRAFT",
      generatedBy: "social_media",
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
    socialResults.push(await getSocialAdapter(platform).publishPost(payload));
  }

  const websiteOk = !websiteEnabled || adapterSucceeded(websiteResult);
  const socialOk =
    socialChannels.length === 0 || socialResults.every((result) => adapterSucceeded(result));
  const attempted = websiteEnabled || socialChannels.length > 0;
  const succeeded = attempted && websiteOk && socialOk;
  agentsStore.upsertCampaign({
    ...campaign,
    taskId: ctx.taskId,
    executionId: ctx.taskId,
    status: succeeded ? "COMPLETED" : "BLOCKED",
    executionResult: {
      available: succeeded,
      published: succeeded,
      status: succeeded ? "completed" : "unavailable",
      reason: succeeded ? undefined : "publishing_unavailable",
    },
    updatedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    output: {
      campaignId: campaign.id,
      available: succeeded,
      published: succeeded,
      status: succeeded ? "completed" : "unavailable",
      campaignStatus: succeeded ? "COMPLETED" : "BLOCKED",
    },
    durationMs: Date.now() - started,
  };
}
