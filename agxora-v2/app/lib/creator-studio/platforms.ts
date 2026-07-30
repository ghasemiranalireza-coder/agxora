import type { AiFeaturePlan, PlatformIntegrationPlan } from "./types";

/**
 * Future platform integrations — architecture only.
 * No fake live API calls.
 */
export const CREATOR_PLATFORM_INTEGRATIONS: readonly PlatformIntegrationPlan[] = [
  {
    id: "instagram",
    platform: "Instagram",
    category: "social",
    status: "planned",
    adapter: "InstagramCreatorAdapter",
    notes: "Official Graph API publish + insights reserved.",
  },
  {
    id: "tiktok",
    platform: "TikTok",
    category: "social",
    status: "planned",
    adapter: "TikTokCreatorAdapter",
    notes: "TikTok Content Posting API adapter reserved.",
  },
  {
    id: "youtube",
    platform: "YouTube",
    category: "social",
    status: "planned",
    adapter: "YouTubeCreatorAdapter",
    notes: "YouTube Data API upload + analytics reserved.",
  },
  {
    id: "facebook",
    platform: "Facebook",
    category: "social",
    status: "planned",
    adapter: "FacebookPagesAdapter",
    notes: "Pages publishing adapter reserved.",
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    category: "social",
    status: "planned",
    adapter: "LinkedInCreatorAdapter",
    notes: "UGC / organization posts adapter reserved.",
  },
  {
    id: "pinterest",
    platform: "Pinterest",
    category: "social",
    status: "planned",
    adapter: "PinterestCreatorAdapter",
    notes: "Pins + boards adapter reserved.",
  },
  {
    id: "threads",
    platform: "Threads",
    category: "social",
    status: "planned",
    adapter: "ThreadsCreatorAdapter",
    notes: "Threads API adapter reserved.",
  },
  {
    id: "x",
    platform: "X",
    category: "social",
    status: "planned",
    adapter: "XCreatorAdapter",
    notes: "X API v2 posts adapter reserved.",
  },
  {
    id: "meta-business",
    platform: "Meta Business",
    category: "ads",
    status: "planned",
    adapter: "MetaBusinessAdapter",
    notes: "Meta Business Suite / Ads Manager hooks reserved.",
  },
  {
    id: "google-ads",
    platform: "Google Ads",
    category: "ads",
    status: "planned",
    adapter: "GoogleAdsAdapter",
    notes: "Google Ads API campaign sync reserved.",
  },
  {
    id: "google-analytics",
    platform: "Google Analytics",
    category: "analytics",
    status: "planned",
    adapter: "GoogleAnalyticsAdapter",
    notes: "GA4 measurement + reporting adapter reserved.",
  },
] as const;

export const AI_CREATOR_FEATURES: readonly AiFeaturePlan[] = [
  {
    id: "ideas",
    label: "Content Ideas",
    description: "Industry-aware idea engine for campaigns and posts.",
    status: "ready",
  },
  {
    id: "captions",
    label: "Caption Generator",
    description: "Brand-voice captions per platform format.",
    status: "ready",
  },
  {
    id: "hashtags",
    label: "Hashtag Suggestions",
    description: "Relevance and reach scoring for hashtag sets.",
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
    description: "Objectives, audience, platforms, and timelines.",
    status: "ready",
  },
  {
    id: "audience",
    label: "Audience Suggestions",
    description: "Segment suggestions from CRM + creator signals.",
    status: "planned",
  },
  {
    id: "schedule",
    label: "Posting Schedule",
    description: "Timezone-aware optimal posting windows.",
    status: "planned",
  },
  {
    id: "brand",
    label: "Brand Consistency",
    description: "Tone and asset checks against brand voice.",
    status: "planned",
  },
  {
    id: "rewrite",
    label: "AI Rewrite",
    description: "Rewrite drafts for clarity, length, or channel.",
    status: "planned",
  },
  {
    id: "translate",
    label: "Translate Content",
    description: "Multi-language translation pipeline reserved.",
    status: "planned",
  },
  {
    id: "i18n",
    label: "Multi-language Support",
    description: "Locale packs for publish and analytics surfaces.",
    status: "planned",
  },
] as const;

/** Contract for future publish adapters. */
export interface CreatorPublishAdapter {
  readonly platformId: string;
  schedule(payload: unknown): Promise<{ readonly jobId: string }>;
  publish(payload: unknown): Promise<{ readonly externalId: string }>;
  fetchInsights(range: { readonly from: string; readonly to: string }): Promise<unknown>;
}
