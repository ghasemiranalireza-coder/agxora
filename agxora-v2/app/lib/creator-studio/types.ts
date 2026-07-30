/**
 * AGXORA AI Creator Studio — domain types.
 * Enterprise content production OS foundation.
 * Separate from CRM; future API adapters plug in here.
 */

export type ContentFormat =
  | "instagram_caption"
  | "tiktok_script"
  | "linkedin_post"
  | "facebook_post"
  | "x_post"
  | "blog_article"
  | "newsletter"
  | "email_campaign"
  | "product_description"
  | "ad_copy"
  | "seo_article"
  | "landing_page_copy";

export type BrandVoice =
  | "professional"
  | "luxury"
  | "friendly"
  | "minimal"
  | "corporate"
  | "creative"
  | "custom";

export type PublishStatus =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "archive";

export type MediaKind = "image" | "video" | "document" | "logo" | "template";

export type IntegrationStatus = "planned" | "ready" | "connected" | "disabled";

export type WorkspaceTab =
  | "create"
  | "campaigns"
  | "media"
  | "templates"
  | "brand"
  | "queue"
  | "analytics";

export interface CreatorKpiMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly caption: string;
  readonly delta?: { readonly value: string; readonly positive: boolean };
}

export interface ContentFormatOption {
  readonly id: ContentFormat;
  readonly label: string;
  readonly description: string;
}

export interface BrandVoiceOption {
  readonly id: BrandVoice;
  readonly label: string;
  readonly description: string;
}

export interface CampaignPlan {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly audience: string;
  readonly platforms: readonly string[];
  readonly budgetPlaceholder: string;
  readonly timeline: string;
  readonly status: string;
}

export interface CalendarItem {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly platform: string;
  readonly status: PublishStatus;
}

export interface MediaAsset {
  readonly id: string;
  readonly name: string;
  readonly kind: MediaKind;
  readonly folder: string;
  readonly tags: readonly string[];
  readonly updatedAt: string;
}

export interface QueueItem {
  readonly id: string;
  readonly title: string;
  readonly platform: string;
  readonly format: ContentFormat;
  readonly status: PublishStatus;
  readonly scheduledAt?: string;
  readonly author: string;
}

export interface AnalyticsMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly change: string;
  readonly positive: boolean;
}

export interface TopPost {
  readonly id: string;
  readonly title: string;
  readonly platform: string;
  readonly engagement: string;
  readonly reach: string;
}

export interface PlatformIntegrationPlan {
  readonly id: string;
  readonly platform: string;
  readonly category: "social" | "ads" | "analytics";
  readonly status: IntegrationStatus;
  readonly adapter: string;
  readonly notes: string;
}

export interface AiFeaturePlan {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly status: IntegrationStatus;
}
