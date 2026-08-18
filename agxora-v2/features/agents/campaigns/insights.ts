import { nowIso } from "../growth/ids";
import type { GrowthBusinessProfile } from "../growth/types";
import type { SocialAccount } from "../social/types";
import type { Campaign, GrowthInsight } from "./types";

export function buildGrowthInsights(input: {
  readonly organizationId: string;
  readonly profile: GrowthBusinessProfile;
  readonly campaign?: Campaign;
  readonly accounts: readonly SocialAccount[];
}): readonly GrowthInsight[] {
  const now = nowIso();
  const insights: GrowthInsight[] = [];
  const campaign = input.campaign;
  const offer = campaign?.offer || input.profile.services[0] || "core service";
  const company = input.profile.companyName.trim() || "the business";

  if (campaign?.websiteProjectId) {
    insights.push({
      id: "insight_priority_cta",
      organizationId: input.organizationId,
      campaignId: campaign.id,
      type: "PRIORITY",
      code: "priority.review_cta",
      severity: "medium",
      source: "website",
      relatedEntityId: campaign.websiteProjectId,
      params: { cta: campaign.websiteCta },
      createdAt: now,
    });
  }

  if (input.profile.services.length > 0 && campaign?.websiteProjectId) {
    insights.push({
      id: "insight_opportunity_service",
      organizationId: input.organizationId,
      campaignId: campaign.id,
      type: "OPPORTUNITY",
      code: "opportunity.promote_service",
      severity: "low",
      source: "website",
      relatedEntityId: campaign.websiteProjectId,
      params: { service: offer, company },
      createdAt: now,
    });
  }

  const socialEnabled = (campaign?.channels ?? []).filter(
    (channel) => channel.enabled && channel.id !== "WEBSITE",
  );
  for (const channel of socialEnabled) {
    const platform = channel.id.toLowerCase();
    const account = input.accounts.find((item) => item.platform === platform);
    if (!account || account.state !== "CONNECTED") {
      insights.push({
        id: `insight_risk_${platform}`,
        organizationId: input.organizationId,
        campaignId: campaign?.id,
        type: "RISK",
        code: "risk.disconnected",
        severity: "high",
        source: "social",
        relatedEntityId: account?.id,
        params: { platform },
        createdAt: now,
      });
    }
  }

  insights.push({
    id: "insight_action_approve",
    organizationId: input.organizationId,
    campaignId: campaign?.id,
    type: "ACTION",
    code: "action.review_approve",
    severity: "medium",
    source: "campaign",
    relatedEntityId: campaign?.id,
    createdAt: now,
  });

  insights.push({
    id: "insight_risk_publishing",
    organizationId: input.organizationId,
    campaignId: campaign?.id,
    type: "RISK",
    code: "risk.publishing_unavailable",
    severity: "high",
    source: "publishing",
    createdAt: now,
  });

  return insights;
}
