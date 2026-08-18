import type { GrowthBusinessProfile, SocialPlatformId } from "../growth/types";
import { DEFAULT_PLATFORMS } from "../growth/types";
import { createGrowthId, nowIso } from "../growth/ids";
import type { SocialContentPillar, SocialStrategy } from "./types";

function platformsOf(
  profile: GrowthBusinessProfile,
): readonly SocialPlatformId[] {
  return profile.preferredPlatforms.length > 0
    ? profile.preferredPlatforms
    : DEFAULT_PLATFORMS;
}

function servicesOf(profile: GrowthBusinessProfile): readonly string[] {
  return profile.services.length > 0
    ? profile.services
    : ["core offering"];
}

export function generateSocialStrategy(input: {
  readonly organizationId: string;
  readonly profile: GrowthBusinessProfile;
}): SocialStrategy {
  const platforms = platformsOf(input.profile);
  const services = servicesOf(input.profile);
  const audience = input.profile.targetAudience?.trim() || "target customers";
  const tone = input.profile.brandTone ?? input.profile.brand.tone;
  const industry =
    input.profile.industry?.trim() ||
    input.profile.businessType?.trim() ||
    "services";
  const company = input.profile.companyName.trim() || "the business";

  const pillars: readonly SocialContentPillar[] = [
    {
      id: "pillar_education",
      name: "Educational",
      description: `Teach ${audience} how ${industry} problems are solved.`,
      theme: "education",
    },
    {
      id: "pillar_behind",
      name: "Behind the scenes",
      description: `Show how ${company} delivers ${services[0]}.`,
      theme: "behind_the_scenes",
    },
    {
      id: "pillar_proof",
      name: "Social proof",
      description: "Demonstrate outcomes and trust signals.",
      theme: "proof",
    },
    {
      id: "pillar_offer",
      name: "Offer",
      description:
        input.profile.socialGoals[0] ||
        input.profile.uniqueSellingProposition ||
        "Invite a conversation.",
      theme: "offer",
    },
  ];

  return {
    id: createGrowthId("sstrat"),
    organizationId: input.organizationId,
    profileId: input.profile.id,
    summary: `${company} will use ${platforms.join(", ")} to reach ${audience} with a ${tone} ${industry} presence.`,
    pillars,
    postingStrategy: `Alternate education, operations, proof, and offer across ${platforms.join(", ")}.`,
    recommendedPlatforms: platforms,
    recommendedFrequency: platforms.includes("tiktok")
      ? "5 posts per week"
      : "4 posts per week",
    audienceThemes: [audience, industry, tone],
    ctaStrategy:
      input.profile.websiteGoal?.trim() ||
      "Ask for a consultation or site visit.",
    contentThemes: pillars.map((pillar) => pillar.theme),
    createdAt: nowIso(),
  };
}
