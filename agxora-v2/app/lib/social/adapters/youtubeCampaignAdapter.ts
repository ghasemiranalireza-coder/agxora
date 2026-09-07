/**
 * Phase 3A — Business Agent YouTube adapter.
 * Wraps the existing official OAuth + resumable upload pipeline.
 * Does not duplicate tokens, OAuth, or the Agent OS unavailable stub map.
 */

import "server-only";

import type { CreativeProject } from "@/features/agents/creative/types";
import type { SocialAdapterResult } from "@/features/agents/social/types";
import { prisma } from "@/app/lib/db/prisma";
import {
  getSocialCredentialSummary,
  getValidSocialAccessTokenForActor,
} from "@/app/lib/social/credentials";
import { isYouTubePublishEnabled } from "@/app/lib/social/config";
import { isVideoCreativeMimeType } from "@/app/lib/creative/assets";
import {
  loadCreativeAssetMedia,
  type CreativePublishLoadedMedia,
} from "@/app/lib/creative/loadCreativeAssetMedia";
import type { CreativeAssetRecord } from "@/app/lib/creative/assetStore";
import type { CreativePublishTarget } from "@/app/lib/creative/platformMap";
import type { Actor } from "@/app/lib/tenancy/types";
import { publishCreativeToYouTube } from "./youtubePublish";
import {
  failedSocial,
  isConfirmedSocialPublish,
  unsupportedSocial,
  type SocialListAccountsResult,
  type SocialProviderAdapter,
  type SocialProviderCapabilities,
  type SocialPublishInput,
  type SocialPublishResult,
} from "./provider";

const YOUTUBE_CAPABILITIES: SocialProviderCapabilities = {
  listAccounts: true,
  publishText: false,
  publishImage: false,
  publishVideo: true,
  schedule: false,
  getPublishStatus: false,
  getInsights: false,
};

export type YouTubeCampaignAdapterDeps = {
  readonly getAccessToken: (actor: Actor) => Promise<string | null>;
  readonly getCredentialSummary: (
    organizationId: string,
  ) => ReturnType<typeof getSocialCredentialSummary>;
  readonly loadAsset: (
    organizationId: string,
    assetId: string,
  ) => Promise<CreativeAssetRecord | null>;
  readonly loadMedia: (record: CreativeAssetRecord) => Promise<CreativePublishLoadedMedia>;
  readonly publishCreative: typeof publishCreativeToYouTube;
};

async function loadOrgAsset(
  organizationId: string,
  assetId: string,
): Promise<CreativeAssetRecord | null> {
  const row = await prisma.creativeAsset.findFirst({
    where: { id: assetId, organizationId },
  });
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    creativeProjectId: row.creativeProjectId,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    durationMs: row.durationMs ?? undefined,
    modality: row.modality ?? undefined,
    providerId: row.providerId ?? undefined,
    providerAssetId: row.providerAssetId ?? undefined,
    storageBackend: row.storageBackend === "object_s3" ? "object_s3" : "inline_bytea",
    objectBucket: row.objectBucket ?? undefined,
    objectKey: row.objectKey ?? undefined,
    bytes: row.bytes ? new Uint8Array(row.bytes) : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const liveDeps: YouTubeCampaignAdapterDeps = {
  getAccessToken: (actor) => getValidSocialAccessTokenForActor(actor, "youtube"),
  getCredentialSummary: (organizationId) =>
    getSocialCredentialSummary(organizationId, "youtube"),
  loadAsset: loadOrgAsset,
  loadMedia: loadCreativeAssetMedia,
  publishCreative: publishCreativeToYouTube,
};

let depsOverride: YouTubeCampaignAdapterDeps | null = null;

export function setYouTubeCampaignAdapterDepsForTests(
  deps: YouTubeCampaignAdapterDeps | null,
): void {
  depsOverride = deps;
}

function resolveDeps(): YouTubeCampaignAdapterDeps {
  return depsOverride ?? liveDeps;
}

function isShortsContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  return (
    normalized === "short" ||
    normalized === "shorts" ||
    normalized === "youtube_shorts"
  );
}

function buildCampaignCreativeProject(input: SocialPublishInput): CreativeProject {
  const shorts = isShortsContentType(input.contentType);
  const now = new Date().toISOString();
  return {
    id: `campaign-item:${input.campaignItemId}`,
    organizationId: input.actor.organizationId,
    profileId: input.actor.workspaceId,
    name: input.title.trim() || "YouTube video",
    creativeType: shorts ? "SOCIAL_VIDEO" : "VIDEO_AD",
    platform: shorts ? "youtube_shorts" : "youtube",
    status: "APPROVED",
    brief: {
      productOrService: "",
      targetAudience: "",
      campaignGoal: "",
      language: "en",
      tone: "",
      durationSeconds: 15,
      aspectRatio: shorts ? "9:16" : "16:9",
      cta: input.description,
      brandNotes: "",
      customerRequest: input.description,
    },
    concepts: [],
    productionPlan: {
      summary: input.description,
      creativeType: shorts ? "SOCIAL_VIDEO" : "VIDEO_AD",
      platform: shorts ? "youtube_shorts" : "youtube",
      modality: "video",
      estimatedDurationSeconds: 15,
      aspectRatio: shorts ? "9:16" : "16:9",
      requiresExternalGeneration: false,
      checklist: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

function youtubePublishTarget(contentType: string): CreativePublishTarget {
  const shorts = isShortsContentType(contentType);
  return {
    socialPlatform: "youtube",
    contentType: shorts ? "SHORT" : "VIDEO",
    adapterAction: "publishPost",
  };
}

function mapYouTubeUploadResult(result: SocialAdapterResult): SocialPublishResult {
  const confirmedId =
    result.published === true && typeof result.externalId === "string"
      ? result.externalId.trim()
      : "";
  if (confirmedId) {
    return {
      kind: "ok",
      externalId: confirmedId,
    };
  }

  const reason = result.reason ?? "youtube_publish_failed";
  if (
    reason === "unsupported_platform" ||
    reason === "unsupported_youtube_plan"
  ) {
    return unsupportedSocial(reason);
  }
  if (result.status === "uploading") {
    return failedSocial(reason || "youtube_upload_incomplete");
  }
  return failedSocial(reason);
}

export const youtubeCampaignAdapter: SocialProviderAdapter = {
  providerId: "youtube",
  getCapabilities() {
    return YOUTUBE_CAPABILITIES;
  },
  async listAccounts(actor: Actor): Promise<SocialListAccountsResult> {
    const summary = await resolveDeps().getCredentialSummary(actor.organizationId);
    if (!summary || summary.revokedAt) {
      return failedSocial("youtube_not_connected");
    }
    return {
      kind: "ok",
      accounts: [
        {
          externalAccountId: summary.externalAccountId,
          externalAccountName: summary.externalAccountName,
        },
      ],
    };
  },
  async publishText(): Promise<SocialPublishResult> {
    return unsupportedSocial("youtube_text_unsupported");
  },
  async publishImage(): Promise<SocialPublishResult> {
    return unsupportedSocial("youtube_image_unsupported");
  },
  async publishVideo(input: SocialPublishInput): Promise<SocialPublishResult> {
    if (!isYouTubePublishEnabled()) {
      return failedSocial("youtube_publish_disabled");
    }

    const deps = resolveDeps();
    const accessToken = await deps.getAccessToken(input.actor);
    if (!accessToken) {
      return failedSocial("youtube_not_connected");
    }

    const assetId = input.mediaAssetId?.trim() ?? "";
    if (!assetId) {
      return failedSocial("video_required");
    }

    const asset = await deps.loadAsset(input.actor.organizationId, assetId);
    if (!asset) {
      return failedSocial("video_required");
    }
    if (!isVideoCreativeMimeType(asset.mimeType)) {
      return failedSocial("video_required");
    }

    const media = await deps.loadMedia(asset);
    const result = await deps.publishCreative({
      project: buildCampaignCreativeProject(input),
      target: youtubePublishTarget(input.contentType),
      media,
      accessToken,
    });
    const mapped = mapYouTubeUploadResult(result);
    if (mapped.kind === "ok" && !isConfirmedSocialPublish(mapped)) {
      return failedSocial("youtube_missing_video_id");
    }
    return mapped;
  },
  async schedule(): Promise<SocialPublishResult> {
    return unsupportedSocial("youtube_schedule_not_implemented");
  },
  async getPublishStatus(): Promise<SocialPublishResult> {
    return unsupportedSocial("youtube_status_not_implemented");
  },
  async getInsights(): Promise<SocialPublishResult> {
    return unsupportedSocial("youtube_analytics_not_implemented");
  },
};
