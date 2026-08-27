/**
 * Phase 58 — Deterministic creative planning generators.
 * These produce specifications only — never media binaries or fake URLs.
 */

import type { GrowthBusinessProfile } from "../growth/types";
import { createGrowthId, nowIso } from "../growth/ids";
import type {
  CreativeAspectRatio,
  CreativeBrief,
  CreativeConcept,
  CreativeDraftInput,
  CreativePlatformId,
  CreativeProductionPlan,
  CreativeProject,
  CreativeScript,
  CreativeStoryboard,
  CreativeType,
} from "./types";

function defaultAspect(platform: CreativePlatformId): CreativeAspectRatio {
  if (
    platform === "instagram_reels" ||
    platform === "tiktok" ||
    platform === "youtube_shorts"
  ) {
    return "9:16";
  }
  if (platform === "instagram_feed") return "1:1";
  if (platform === "facebook") return "4:5";
  return "16:9";
}

function defaultDuration(
  creativeType: CreativeType,
  platform: CreativePlatformId,
): number {
  if (creativeType === "IMAGE_AD" || creativeType === "CREATIVE_CONCEPT") return 0;
  if (platform === "youtube") return 30;
  if (platform === "instagram_feed") return 15;
  return 20;
}

function modalityFor(
  creativeType: CreativeType,
): CreativeProductionPlan["modality"] {
  if (creativeType === "IMAGE_AD") return "image";
  if (creativeType === "ANIMATION") return "animation";
  return "video";
}

export function buildCreativeBrief(
  input: CreativeDraftInput,
  profile: GrowthBusinessProfile,
): CreativeBrief {
  const product =
    input.productOrService?.trim() ||
    profile.services[0] ||
    profile.products[0] ||
    profile.companyName;
  const audience =
    input.targetAudience?.trim() ||
    profile.targetAudience ||
    "Target customers in the primary market";
  const tone =
    input.tone?.trim() ||
    profile.brandTone ||
    profile.brand?.tone ||
    "professional";
  const platform = input.platform;
  return {
    productOrService: product,
    targetAudience: audience,
    campaignGoal:
      input.campaignGoal?.trim() ||
      "Drive awareness and conversions for the offer",
    language: input.language?.trim() || "en",
    tone,
    durationSeconds:
      input.durationSeconds ?? defaultDuration(input.creativeType, platform),
    aspectRatio: input.aspectRatio ?? defaultAspect(platform),
    cta: input.cta?.trim() || `Discover ${product}`,
    brandNotes: [
      profile.companyName,
      profile.uniqueSellingProposition,
      profile.visualPreferences,
    ]
      .filter(Boolean)
      .join(" · "),
    customerRequest: input.customerRequest.trim(),
  };
}

export function generateCreativeConcepts(
  brief: CreativeBrief,
  creativeType: CreativeType,
  platform: CreativePlatformId,
): readonly CreativeConcept[] {
  const base = brief.productOrService;
  return [
    {
      id: createGrowthId("cconcept"),
      title: `${base} — Hook first`,
      hook: `Stop scrolling: ${base} just changed the game.`,
      summary: `Open with a bold claim about ${base}, show the transformation, end with ${brief.cta}.`,
      angle: "problem_solution",
    },
    {
      id: createGrowthId("cconcept"),
      title: `${base} — Social proof`,
      hook: `Why ${brief.targetAudience} choose ${base}.`,
      summary: `Lead with audience pain, demonstrate the product benefit, reinforce brand trust for ${platform}.`,
      angle: "social_proof",
    },
    {
      id: createGrowthId("cconcept"),
      title: `${base} — ${creativeType} spotlight`,
      hook: `A ${brief.durationSeconds || 15}s look at ${base}.`,
      summary: `Fast-paced visual showcase tailored to ${platform} with on-screen CTA.`,
      angle: "product_showcase",
    },
  ];
}

export function generateCreativeScript(
  brief: CreativeBrief,
  concept: CreativeConcept,
): CreativeScript {
  const total = Math.max(brief.durationSeconds || 15, 9);
  const sceneDur = Math.max(3, Math.floor(total / 3));
  const scenes = [
    {
      id: createGrowthId("cscene"),
      order: 1,
      title: "Hook",
      narration: concept.hook,
      onScreenText: concept.hook.slice(0, 48),
      visualDirection: `Attention-grabbing opening for ${brief.productOrService}`,
      durationSeconds: sceneDur,
    },
    {
      id: createGrowthId("cscene"),
      order: 2,
      title: "Value",
      narration: `See how ${brief.productOrService} helps ${brief.targetAudience}. ${brief.brandNotes}`,
      onScreenText: brief.productOrService,
      visualDirection: "Demonstrate product/service benefit with brand visuals",
      durationSeconds: sceneDur,
    },
    {
      id: createGrowthId("cscene"),
      order: 3,
      title: "CTA",
      narration: brief.cta,
      onScreenText: brief.cta,
      visualDirection: "Close on logo/CTA with clear next step",
      durationSeconds: Math.max(3, total - sceneDur * 2),
    },
  ];
  return {
    title: concept.title,
    voiceOver: scenes.map((s) => s.narration).join(" "),
    dialogueNotes: `Tone: ${brief.tone}. Language: ${brief.language}.`,
    captions: scenes.map((s) => s.onScreenText),
    scenes,
    cta: brief.cta,
  };
}

export function generateCreativeStoryboard(
  script: CreativeScript,
  brief: CreativeBrief,
): CreativeStoryboard {
  return {
    frames: script.scenes.map((scene) => ({
      id: createGrowthId("cframe"),
      order: scene.order,
      sceneId: scene.id,
      description: scene.title,
      camera: scene.order === 1 ? "close-up / punch-in" : "medium / product focus",
      visualDirection: scene.visualDirection,
      onScreenText: scene.onScreenText,
      audioDirection:
        scene.order === 3
          ? "Music swell + voice CTA"
          : "Upbeat brand bed under VO",
    })),
    musicDirection: `Upbeat ${brief.tone} underscore matching brand energy`,
    soundEffects: ["whoosh_transition", "soft_click_cta"],
  };
}

export function buildProductionPlan(
  creativeType: CreativeType,
  platform: CreativePlatformId,
  brief: CreativeBrief,
): CreativeProductionPlan {
  const modality = modalityFor(creativeType);
  return {
    summary: `Produce a ${creativeType} for ${platform} (${brief.aspectRatio}, ${brief.durationSeconds}s).`,
    creativeType,
    platform,
    modality,
    estimatedDurationSeconds: brief.durationSeconds,
    aspectRatio: brief.aspectRatio,
    requiresExternalGeneration:
      creativeType === "VIDEO_AD" ||
      creativeType === "SOCIAL_VIDEO" ||
      creativeType === "ANIMATION" ||
      creativeType === "IMAGE_AD",
    checklist: [
      "Brief locked",
      "Concept selected",
      "Script reviewed",
      "Storyboard reviewed",
      "AgentApproval before external generation",
      "Provider must be configured for media output",
    ],
  };
}

export function createCreativeProject(input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly campaignId?: string;
  readonly customerId?: string;
  readonly creativeType: CreativeType;
  readonly platform: CreativePlatformId;
  readonly brief: CreativeBrief;
  readonly concepts: readonly CreativeConcept[];
}): CreativeProject {
  const now = nowIso();
  return {
    id: createGrowthId("creative"),
    organizationId: input.organizationId,
    profileId: input.profileId,
    campaignId: input.campaignId,
    customerId: input.customerId,
    name: `${input.brief.productOrService} · ${input.platform}`,
    creativeType: input.creativeType,
    platform: input.platform,
    status: "PLANNED",
    brief: input.brief,
    concepts: input.concepts,
    createdAt: now,
    updatedAt: now,
  };
}
