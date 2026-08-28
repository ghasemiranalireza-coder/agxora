/**
 * Phase 58 — Creative production domain types.
 * Planning/specification is first-class; media rendering is provider-dependent.
 */

import type { ApprovalState } from "../types";

export type CreativeType =
  | "VIDEO_AD"
  | "SOCIAL_VIDEO"
  | "ANIMATION"
  | "IMAGE_AD"
  | "STORYBOARD"
  | "SCRIPT"
  | "CREATIVE_CONCEPT";

export type CreativePlatformId =
  | "instagram_reels"
  | "instagram_feed"
  | "tiktok"
  | "youtube_shorts"
  | "youtube"
  | "facebook";

export type CreativeStatus =
  | "PLANNED"
  | "READY_FOR_APPROVAL"
  | "APPROVED"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "PROVIDER_UNAVAILABLE";

export type CreativeAspectRatio =
  | "9:16"
  | "16:9"
  | "1:1"
  | "4:5"
  | "4:3";

export const CREATIVE_TYPES: readonly CreativeType[] = [
  "VIDEO_AD",
  "SOCIAL_VIDEO",
  "ANIMATION",
  "IMAGE_AD",
  "STORYBOARD",
  "SCRIPT",
  "CREATIVE_CONCEPT",
] as const;

export const CREATIVE_PLATFORMS: readonly CreativePlatformId[] = [
  "instagram_reels",
  "instagram_feed",
  "tiktok",
  "youtube_shorts",
  "youtube",
  "facebook",
] as const;

export const CREATIVE_STATUSES: readonly CreativeStatus[] = [
  "PLANNED",
  "READY_FOR_APPROVAL",
  "APPROVED",
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "BLOCKED",
  "PROVIDER_UNAVAILABLE",
] as const;

export interface CreativeBrief {
  readonly productOrService: string;
  readonly targetAudience: string;
  readonly campaignGoal: string;
  readonly language: string;
  readonly tone: string;
  readonly durationSeconds: number;
  readonly aspectRatio: CreativeAspectRatio;
  readonly cta: string;
  readonly brandNotes: string;
  readonly customerRequest: string;
}

export interface CreativeConcept {
  readonly id: string;
  readonly title: string;
  readonly hook: string;
  readonly summary: string;
  readonly angle: string;
}

export interface CreativeScriptScene {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly narration: string;
  readonly onScreenText: string;
  readonly visualDirection: string;
  readonly durationSeconds: number;
}

export interface CreativeScript {
  readonly title: string;
  readonly voiceOver: string;
  readonly dialogueNotes: string;
  readonly captions: readonly string[];
  readonly scenes: readonly CreativeScriptScene[];
  readonly cta: string;
}

export interface CreativeStoryboardFrame {
  readonly id: string;
  readonly order: number;
  readonly sceneId: string;
  readonly description: string;
  readonly camera: string;
  readonly visualDirection: string;
  readonly onScreenText: string;
  readonly audioDirection: string;
}

export interface CreativeStoryboard {
  readonly frames: readonly CreativeStoryboardFrame[];
  readonly musicDirection: string;
  readonly soundEffects: readonly string[];
}

export interface CreativeProductionPlan {
  readonly summary: string;
  readonly creativeType: CreativeType;
  readonly platform: CreativePlatformId;
  readonly modality: "image" | "video" | "animation";
  readonly estimatedDurationSeconds: number;
  readonly aspectRatio: CreativeAspectRatio;
  readonly requiresExternalGeneration: boolean;
  readonly checklist: readonly string[];
}

export interface CreativeAssetRef {
  readonly providerId: string;
  readonly providerAssetId?: string;
  readonly url?: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
}

export interface CreativeProductionResult {
  readonly available: boolean;
  readonly generated: boolean;
  readonly status: "unavailable" | "completed" | "failed" | "blocked";
  readonly reason?: string;
  readonly providerId?: string;
  readonly assets?: readonly CreativeAssetRef[];
}

/** Phase 63.0 — publish metadata only (no bytes, tokens, or secrets). */
export interface CreativePublishResult {
  readonly available: boolean;
  readonly status: "unavailable" | "published" | "failed" | "uploading";
  readonly published: boolean;
  readonly reason?: string;
  readonly platform?: string;
  readonly contentType?: string;
  readonly externalId?: string;
  readonly externalUrl?: string;
  readonly publishedAt?: string;
  readonly executionJobId?: string;
}

export interface CreativeProject {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly campaignId?: string;
  readonly customerId?: string;
  readonly name: string;
  readonly creativeType: CreativeType;
  readonly platform: CreativePlatformId;
  readonly status: CreativeStatus;
  readonly brief: CreativeBrief;
  readonly concepts: readonly CreativeConcept[];
  readonly script?: CreativeScript;
  readonly storyboard?: CreativeStoryboard;
  readonly productionPlan?: CreativeProductionPlan;
  readonly productionResult?: CreativeProductionResult;
  readonly publishResult?: CreativePublishResult;
  readonly approvalState?: ApprovalState;
  readonly executionJobId?: string;
  readonly publishExecutionJobId?: string;
  readonly taskId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CreativeDraftInput = {
  readonly organizationId: string;
  readonly profileId?: string;
  readonly campaignId?: string;
  readonly customerId?: string;
  readonly creativeType: CreativeType;
  readonly platform: CreativePlatformId;
  readonly customerRequest: string;
  readonly language?: string;
  readonly durationSeconds?: number;
  readonly aspectRatio?: CreativeAspectRatio;
  readonly cta?: string;
  readonly productOrService?: string;
  readonly targetAudience?: string;
  readonly campaignGoal?: string;
  readonly tone?: string;
};
