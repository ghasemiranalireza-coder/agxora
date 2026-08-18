import type { ApprovalState } from "../types";
import type { SocialPlatformId } from "../growth/types";

export type SocialAccountState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "EXPIRED"
  | "REAUTH_REQUIRED"
  | "ERROR";

export type SocialContentType =
  | "POST"
  | "STORY"
  | "REEL"
  | "VIDEO"
  | "CAROUSEL"
  | "SHORT"
  | "ARTICLE";

export type SocialContentStatus =
  | "DRAFT"
  | "PLANNED"
  | "APPROVED"
  | "READY"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "BLOCKED"
  | "REJECTED"
  | "NEEDS_CHANGES";

export interface SocialAccount {
  readonly id: string;
  readonly organizationId: string;
  readonly platform: SocialPlatformId;
  readonly displayName?: string;
  readonly handle?: string;
  readonly state: SocialAccountState;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SocialContentPillar {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly theme: string;
}

export interface SocialStrategy {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly summary: string;
  readonly pillars: readonly SocialContentPillar[];
  readonly postingStrategy: string;
  readonly recommendedPlatforms: readonly SocialPlatformId[];
  readonly recommendedFrequency: string;
  readonly audienceThemes: readonly string[];
  readonly ctaStrategy: string;
  readonly contentThemes: readonly string[];
  readonly createdAt: string;
}

export interface SocialContentItem {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly calendarId?: string;
  readonly platform: SocialPlatformId;
  readonly contentType: SocialContentType;
  readonly title: string;
  readonly topic: string;
  readonly caption: string;
  readonly cta: string;
  readonly hashtags: readonly string[];
  readonly visualDirection: string;
  readonly pillar?: string;
  readonly scheduledAt?: string;
  readonly status: SocialContentStatus;
  readonly approvalState?: ApprovalState;
  readonly generatedBy: "social_media";
  readonly executionId?: string;
  readonly taskId?: string;
  readonly publishResult?: SocialAdapterResult;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SocialCalendarEntry {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly platform: SocialPlatformId;
  readonly contentType: Extract<SocialContentType, "POST" | "STORY">;
  readonly topic: string;
  readonly pillar: string;
  readonly caption: string;
  readonly cta: string;
  readonly status: SocialContentStatus;
  readonly approvalState?: ApprovalState;
  readonly contentId?: string;
}

export interface SocialContentCalendar {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly strategyId?: string;
  readonly weekStart: string;
  readonly entries: readonly SocialCalendarEntry[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SocialPublishingJob {
  readonly id: string;
  readonly organizationId: string;
  readonly contentId: string;
  readonly platform: SocialPlatformId;
  readonly action: "publish" | "schedule";
  readonly status: SocialContentStatus;
  readonly available: boolean;
  readonly result?: SocialAdapterResult;
  readonly executionId?: string;
  readonly taskId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SocialAdapterResult {
  readonly available: boolean;
  readonly status: "unavailable" | "published" | "scheduled" | "failed";
  readonly published: boolean;
  readonly reason?: string;
  readonly externalId?: string;
}

export type SocialPost = SocialContentItem;
export type SocialStory = SocialContentItem;
