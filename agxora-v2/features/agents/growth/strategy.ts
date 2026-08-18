import type { GrowthBusinessProfile, GrowthStrategy } from "./types";
import { DEFAULT_PLATFORMS } from "./types";
import { createGrowthId, nowIso } from "./ids";

export function buildGrowthStrategy(
  profile: GrowthBusinessProfile,
): GrowthStrategy {
  const platforms =
    profile.preferredPlatforms.length > 0
      ? profile.preferredPlatforms
      : DEFAULT_PLATFORMS;
  const company = profile.companyName.trim() || "the business";
  const audience = profile.targetAudience?.trim() || "target customers";
  return {
    id: createGrowthId("gstrat"),
    organizationId: profile.organizationId,
    profileId: profile.id,
    summary: `${company} will convert ${audience} through a structured website and ${platforms.join(", ")} content system.`,
    websiteDirection:
      profile.websiteGoal?.trim() ||
      "Publish a professional multi-page preview that explains services and captures inquiries.",
    socialDirection:
      profile.socialGoals[0] ||
      "Build trust with educational posts, proof, and a clear consultation CTA.",
    priorities: [
      "Clarify positioning",
      "Generate website preview",
      "Plan social calendar",
      "Keep publishing behind approval and adapters",
    ],
    recommendedPlatforms: platforms,
    createdAt: nowIso(),
  };
}
