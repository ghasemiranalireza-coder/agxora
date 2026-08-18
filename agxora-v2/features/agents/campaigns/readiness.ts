import type { GrowthBusinessProfile, SocialPlatformId } from "../growth/types";
import { SOCIAL_PLATFORMS } from "../growth/types";
import type { SocialAccount } from "../social/types";
import type { WebsiteProject } from "../website/types";
import type { Campaign, CampaignReadiness } from "./types";

const CHECK_WEIGHTS: Readonly<Record<string, number>> = {
  "profile.company": 10,
  "campaign.objective": 10,
  "campaign.audience": 10,
  "campaign.offer": 10,
  "website.present": 15,
  "website.approved": 10,
  "social.content": 15,
  "social.connected": 10,
  "publishing.available": 10,
};

function socialChannels(campaign: Campaign): readonly SocialPlatformId[] {
  return campaign.channels
    .filter((channel) => channel.enabled && channel.id !== "WEBSITE")
    .map((channel) => channel.id.toLowerCase())
    .filter((platform): platform is SocialPlatformId =>
      SOCIAL_PLATFORMS.includes(platform as SocialPlatformId),
    );
}

export function evaluateCampaignReadiness(input: {
  readonly profile: GrowthBusinessProfile;
  readonly campaign?: Campaign;
  readonly accounts: readonly SocialAccount[];
  readonly website?: WebsiteProject;
}): CampaignReadiness {
  const completedChecks: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const campaign = input.campaign;

  if (input.profile.companyName.trim()) completedChecks.push("profile.company");
  else warnings.push("profile.incomplete");

  if (campaign?.objective.statement.trim()) completedChecks.push("campaign.objective");
  else warnings.push("campaign.objective_missing");

  if (campaign?.audience.description.trim()) completedChecks.push("campaign.audience");
  else warnings.push("campaign.audience_missing");

  if (campaign?.offer.trim()) completedChecks.push("campaign.offer");
  else warnings.push("campaign.offer_missing");

  const website = input.website;
  if (campaign?.websiteProjectId || website) completedChecks.push("website.present");
  else warnings.push("website.missing");

  if (website?.approvalState === "APPROVED" || website?.status === "APPROVED") {
    completedChecks.push("website.approved");
  } else if (campaign?.websiteProjectId || website) {
    warnings.push("website.needs_review");
  }

  if ((campaign?.contentIds.length ?? 0) > 0) completedChecks.push("social.content");
  else warnings.push("social.content_missing");

  const requiredPlatforms = socialChannels(
    campaign ?? ({ channels: [] } as unknown as Campaign),
  );
  const connected = new Set(
    input.accounts
      .filter((account) => account.state === "CONNECTED")
      .map((account) => account.platform),
  );
  const missingConnection = requiredPlatforms.filter(
    (platform) => !connected.has(platform),
  );
  if (requiredPlatforms.length === 0 || missingConnection.length === 0) {
    completedChecks.push("social.connected");
  } else {
    blockers.push("social.disconnected");
  }

  blockers.push("publishing.unavailable");

  if (campaign?.approvalState !== "APPROVED") {
    warnings.push("campaign.unapproved");
  }

  const score = completedChecks.reduce(
    (sum, check) => sum + (CHECK_WEIGHTS[check] ?? 0),
    0,
  );
  return {
    campaignId: campaign?.id,
    ready: blockers.length === 0 && score >= 80,
    score,
    blockers,
    warnings,
    completedChecks,
  };
}
