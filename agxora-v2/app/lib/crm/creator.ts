import type { AiCreatorCapability, CreatorPlatformPlan } from "./types";

/**
 * Creator Studio — platform integration registry.
 * Official platform APIs will plug into these adapters later.
 * No live publishing or OAuth yet.
 */
export const CREATOR_PLATFORMS: readonly CreatorPlatformPlan[] = [
  {
    id: "instagram",
    platform: "Instagram",
    status: "planned",
    capabilities: ["publish", "insights", "inbox", "scheduling"],
    adapter: "InstagramCreatorAdapter",
  },
  {
    id: "tiktok",
    platform: "TikTok",
    status: "planned",
    capabilities: ["publish", "insights", "scheduling"],
    adapter: "TikTokCreatorAdapter",
  },
  {
    id: "youtube",
    platform: "YouTube",
    status: "planned",
    capabilities: ["publish", "insights", "scheduling"],
    adapter: "YouTubeCreatorAdapter",
  },
  {
    id: "facebook",
    platform: "Facebook",
    status: "planned",
    capabilities: ["publish", "insights", "inbox", "scheduling"],
    adapter: "FacebookCreatorAdapter",
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    status: "planned",
    capabilities: ["publish", "insights", "scheduling"],
    adapter: "LinkedInCreatorAdapter",
  },
  {
    id: "pinterest",
    platform: "Pinterest",
    status: "planned",
    capabilities: ["publish", "insights", "scheduling"],
    adapter: "PinterestCreatorAdapter",
  },
  {
    id: "threads",
    platform: "Threads",
    status: "planned",
    capabilities: ["publish", "insights", "scheduling"],
    adapter: "ThreadsCreatorAdapter",
  },
  {
    id: "x",
    platform: "X",
    status: "planned",
    capabilities: ["publish", "insights", "scheduling"],
    adapter: "XCreatorAdapter",
  },
] as const;

/**
 * AI Creator capability map — future-ready product surface.
 * Architecture only; generation/scheduling APIs not wired.
 */
export const AI_CREATOR_CAPABILITIES: readonly AiCreatorCapability[] = [
  {
    id: "ideas",
    label: "Content Ideas",
    description: "Industry-aware idea engine for campaigns and posts.",
    status: "planned",
  },
  {
    id: "captions",
    label: "AI Captions",
    description: "Brand-voice captions per platform format.",
    status: "planned",
  },
  {
    id: "hashtags",
    label: "AI Hashtags",
    description: "Hashtag sets with reach and relevance scoring.",
    status: "planned",
  },
  {
    id: "calendar",
    label: "Content Calendar",
    description: "Cross-platform editorial calendar foundation.",
    status: "ready",
  },
  {
    id: "campaigns",
    label: "Campaign Planner",
    description: "Campaign briefs, assets, and launch windows.",
    status: "planned",
  },
  {
    id: "brand-voice",
    label: "Brand Voice",
    description: "Tone profiles shared across CRM and Creator OS.",
    status: "planned",
  },
  {
    id: "image-gen",
    label: "Image Generation",
    description: "Provider-agnostic image generation adapter slot.",
    status: "planned",
  },
  {
    id: "video-gen",
    label: "Video Generation",
    description: "Provider-agnostic video generation adapter slot.",
    status: "planned",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Unified performance metrics across platforms.",
    status: "planned",
  },
  {
    id: "scheduling",
    label: "Scheduling",
    description: "Timezone-aware schedule queue contracts.",
    status: "ready",
  },
  {
    id: "publishing",
    label: "Publishing Queue",
    description: "Durable publish jobs with retry + audit trail.",
    status: "planned",
  },
  {
    id: "insights",
    label: "Performance Insights",
    description: "AI insights over reach, engagement, and conversions.",
    status: "planned",
  },
] as const;

export interface CreatorPublishAdapter {
  readonly platformId: string;
  schedule(payload: unknown): Promise<{ readonly jobId: string }>;
  publish(payload: unknown): Promise<{ readonly externalId: string }>;
  fetchInsights(range: { readonly from: string; readonly to: string }): Promise<unknown>;
}
