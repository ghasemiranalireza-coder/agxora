/**
 * Phase 63.0 — invoke SocialPlatformAdapter for creative publish (server-only).
 */

import "server-only";

import type { CreativeProject } from "@/features/agents/creative/types";
import type { SocialAdapterResult } from "@/features/agents/social/types";
import { getSocialAdapter } from "@/features/agents/social/adapters";
import type { CreativePublishTarget } from "./platformMap";

export type CreativePublishMedia = {
  readonly mimeType: string;
  readonly byteSize: number;
  readonly bytes: Uint8Array;
  readonly assetId: string;
};

export async function invokeSocialAdapterForCreativePublish(input: {
  readonly project: CreativeProject;
  readonly target: CreativePublishTarget;
  readonly media: CreativePublishMedia;
}): Promise<SocialAdapterResult> {
  void input.media;
  const adapter = getSocialAdapter(input.target.socialPlatform);
  const caption =
    input.project.brief.cta ||
    input.project.brief.customerRequest ||
    input.project.name;
  const item = {
    id: input.project.id,
    organizationId: input.project.organizationId,
    profileId: input.project.profileId,
    platform: input.target.socialPlatform,
    contentType: input.target.contentType,
    title: input.project.name,
    topic: input.project.brief.customerRequest,
    caption,
    cta: input.project.brief.cta,
    hashtags: [],
    visualDirection: input.project.brief.brandNotes,
    status: "READY" as const,
    generatedBy: "social_media" as const,
    createdAt: input.project.createdAt,
    updatedAt: input.project.updatedAt,
  };

  if (input.target.adapterAction === "publishStory") {
    return adapter.publishStory(item);
  }
  return adapter.publishPost(item);
}
