/**
 * Phase 63.0 — map creative production plan platform/modality to social publish targets.
 */

import "server-only";

import type { CreativePlatformId } from "@/features/agents/creative/types";
import type { SocialPlatformId } from "@/features/agents/growth/types";
import type { SocialContentType } from "@/features/agents/social/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export type CreativePublishTarget = {
  readonly socialPlatform: SocialPlatformId;
  readonly contentType: SocialContentType;
  readonly adapterAction: "publishPost" | "publishStory";
};

export function mapCreativeToSocialPublishTarget(input: {
  readonly platform: CreativePlatformId;
  readonly modality: "image" | "video" | "animation";
}): CreativePublishTarget {
  if (input.modality === "animation") {
    throw new PersistenceError("validation", "Animation publish is not supported", {
      details: [{ field: "modality", message: "animation_blocked" }],
    });
  }

  switch (input.platform) {
    case "instagram_reels":
      return {
        socialPlatform: "instagram",
        contentType: "REEL",
        adapterAction: "publishStory",
      };
    case "instagram_feed":
      return {
        socialPlatform: "instagram",
        contentType: input.modality === "image" ? "POST" : "REEL",
        adapterAction: input.modality === "image" ? "publishPost" : "publishStory",
      };
    case "tiktok":
      return {
        socialPlatform: "tiktok",
        contentType: input.modality === "image" ? "POST" : "SHORT",
        adapterAction: "publishPost",
      };
    case "youtube_shorts":
      return {
        socialPlatform: "youtube",
        contentType: "SHORT",
        adapterAction: "publishPost",
      };
    case "youtube":
      return {
        socialPlatform: "youtube",
        contentType: "VIDEO",
        adapterAction: "publishPost",
      };
    case "facebook":
      return {
        socialPlatform: "facebook",
        contentType: input.modality === "image" ? "POST" : "VIDEO",
        adapterAction: "publishPost",
      };
    default:
      throw new PersistenceError("validation", "Unsupported creative platform", {
        details: [{ field: "platform", message: "unsupported" }],
      });
  }
}
