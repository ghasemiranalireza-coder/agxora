import type { GrowthBusinessProfile, GrowthStrategy, SocialPlatformId } from "../growth/types";
import { createGrowthId, nowIso } from "../growth/ids";
import type { SocialContentCalendar, SocialContentItem, SocialStrategy } from "../social/types";
import type { WebsiteProject } from "../website/types";
import type {
  Campaign,
  CampaignAsset,
  CampaignChannel,
  CampaignChannelId,
  CampaignMilestone,
  CampaignPlanInput,
  CampaignTask,
} from "./types";
import { CAMPAIGN_CHANNELS } from "./types";

const PLATFORM_TO_CHANNEL: Record<SocialPlatformId, CampaignChannelId> = {
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
  tiktok: "TIKTOK",
  linkedin: "LINKEDIN",
  youtube: "YOUTUBE",
};

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function companyName(profile: GrowthBusinessProfile): string {
  return profile.companyName.trim() || "AGXORA";
}

function offerOf(profile: GrowthBusinessProfile, override?: string): string {
  if (override?.trim()) return override.trim();
  return profile.services[0]?.trim() || profile.products[0]?.trim() || "core service";
}

function audienceOf(profile: GrowthBusinessProfile, override?: string): string {
  if (override?.trim()) return override.trim();
  return profile.targetAudience?.trim() || "local customers";
}

function channelsOf(
  profile: GrowthBusinessProfile,
  selected?: readonly CampaignChannelId[],
): readonly CampaignChannel[] {
  const enabled = new Set<CampaignChannelId>(
    selected && selected.length > 0
      ? selected
      : [
          "WEBSITE",
          ...profile.preferredPlatforms.map((platform) => PLATFORM_TO_CHANNEL[platform]),
        ],
  );
  if (!enabled.has("WEBSITE")) enabled.add("WEBSITE");
  return CAMPAIGN_CHANNELS.map((id) => ({ id, enabled: enabled.has(id) }));
}

function task(
  code: string,
  status: CampaignTask["status"],
  externalSideEffect: boolean,
): CampaignTask {
  return {
    id: `ctask_${code}`,
    code,
    status,
    externalSideEffect,
    requiresApproval: externalSideEffect,
  };
}

export function planCampaign(input: {
  readonly profile: GrowthBusinessProfile;
  readonly strategy?: GrowthStrategy;
  readonly website?: WebsiteProject;
  readonly socialStrategy?: SocialStrategy;
  readonly calendar?: SocialContentCalendar;
  readonly content?: readonly SocialContentItem[];
  readonly request?: CampaignPlanInput;
  readonly campaignId?: string;
}): Campaign {
  const profile = input.profile;
  const offer = offerOf(profile, input.request?.offer);
  const audience = audienceOf(profile, input.request?.audience);
  const company = companyName(profile);
  const channels = channelsOf(profile, input.request?.channels);
  const enabledSocial = channels.filter((channel) => channel.enabled && channel.id !== "WEBSITE");
  const usp =
    profile.uniqueSellingProposition?.trim() ||
    `${company} delivers ${offer} for ${audience}.`;
  const objective =
    input.request?.objective?.trim() ||
    profile.websiteGoal?.trim() ||
    `Generate qualified ${offer} inquiries from ${audience}.`;
  const websiteCta =
    input.website?.pages
      .flatMap((page) => page.sections)
      .find((section) => section.type === "cta")?.ctaLabel ||
    profile.websiteGoal?.trim() ||
    "Contact";
  const socialThemes =
    input.socialStrategy?.contentThemes ??
    input.socialStrategy?.pillars.map((pillar) => pillar.theme) ??
    ["education", "proof", "offer"];
  const startDate = input.calendar?.weekStart ?? profile.createdAt.slice(0, 10);
  const endDate = addDays(startDate, 13);
  const assets: CampaignAsset[] = [];
  if (input.website) {
    assets.push({
      id: "asset_website",
      kind: "website",
      refId: input.website.id,
      label: input.website.name,
    });
  }
  if (input.socialStrategy) {
    assets.push({
      id: "asset_social_strategy",
      kind: "strategy",
      refId: input.socialStrategy.id,
      label: "social-strategy",
    });
  }
  if (input.calendar) {
    assets.push({
      id: "asset_calendar",
      kind: "calendar",
      refId: input.calendar.id,
      label: input.calendar.weekStart,
    });
  }
  for (const item of input.content ?? []) {
    assets.push({
      id: `asset_content_${item.id}`,
      kind: "social_content",
      refId: item.id,
      label: item.title,
    });
  }

  const tasks: CampaignTask[] = [
    task("prepare_website", input.website ? "completed" : "pending", false),
    task("review_website_cta", input.website ? "pending" : "blocked", false),
    task(
      "prepare_social_post",
      (input.content ?? []).some((item) => item.contentType === "POST")
        ? "completed"
        : "pending",
      false,
    ),
    task(
      "prepare_social_story",
      (input.content ?? []).some((item) => item.contentType === "STORY")
        ? "completed"
        : "pending",
      false,
    ),
    task("review_campaign_copy", "pending", false),
    task("approve_campaign", "pending", true),
    task(
      "connect_social_account",
      enabledSocial.length > 0 ? "pending" : "completed",
      true,
    ),
    task("configure_publishing", "pending", true),
    task("schedule_content", "pending", true),
    task("publish_content", "pending", true),
  ];

  const milestones: CampaignMilestone[] = [
    { id: "ms_plan", code: "plan_ready", dueOffsetDays: 0 },
    { id: "ms_review", code: "review_assets", dueOffsetDays: 3 },
    { id: "ms_approve", code: "approval", dueOffsetDays: 5 },
    { id: "ms_execute", code: "execution", dueOffsetDays: 7 },
  ];

  const now = nowIso();
  return {
    id: input.campaignId ?? createGrowthId("camp"),
    organizationId: profile.organizationId,
    businessProfileId: profile.id,
    name: `${company} · ${offer}`,
    objective: {
      statement: objective,
      metric: `inquiries_for_${offer.replace(/\s+/g, "_").toLowerCase()}`,
    },
    audience: {
      description: audience,
      location: profile.country,
    },
    offer,
    coreMessage: usp,
    websiteCta,
    socialThemes,
    channels,
    startDate,
    endDate,
    status: "READY_FOR_APPROVAL",
    strategy:
      input.strategy?.summary ||
      `${company} will promote ${offer} to ${audience} through ${channels
        .filter((channel) => channel.enabled)
        .map((channel) => channel.id)
        .join(", ")}.`,
    assets,
    tasks,
    milestones,
    websiteProjectId: input.website?.id,
    socialStrategyId: input.socialStrategy?.id,
    calendarId: input.calendar?.id,
    contentIds: (input.content ?? []).map((item) => item.id),
    createdAt: now,
    updatedAt: now,
  };
}
