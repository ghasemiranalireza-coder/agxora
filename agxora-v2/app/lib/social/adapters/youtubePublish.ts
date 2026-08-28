/**
 * Phase 63.1 / 64.0 / 65.0 — YouTube creative publish adapter.
 * Phase 64: incremental stream upload, size/duration guards.
 * Phase 65: reusable resumable primitives for sync + async worker paths.
 */

import "server-only";

import type { CreativeProject } from "@/features/agents/creative/types";
import type { SocialAdapterResult } from "@/features/agents/social/types";
import type { CreativePublishLoadedMedia } from "@/app/lib/creative/loadCreativeAssetMedia";
import type { CreativePublishTarget } from "@/app/lib/creative/platformMap";
import { getCreativeBlobConfig } from "@/app/lib/creative/blobStore/config";
import {
  getYouTubeDefaultPrivacyStatus,
  getYouTubeUploadMaxDurationMs,
  isYouTubePublishEnabled,
} from "../config";
import {
  finalizeYouTubeResumableUpload,
  initializeYouTubeResumableUpload,
  mapYouTubeUploadError,
  resumeYouTubeUploadFromOffset,
  resolveYouTubeResumableDeps,
  uploadYouTubeChunk,
  YOUTUBE_UPLOAD_CHUNK_SIZE,
  type YouTubeResumableDeps,
} from "./youtubeResumable";

export type YouTubeUploadDeps = YouTubeResumableDeps;

let depsOverride: YouTubeUploadDeps | null = null;

/** Test-only dependency injection for clocks and fetch. */
export function setYouTubeUploadDepsForTests(deps: YouTubeUploadDeps | null): void {
  depsOverride = deps;
}

function resolveDeps(): YouTubeUploadDeps {
  return depsOverride ?? resolveYouTubeResumableDeps();
}

function unavailable(reason: string): SocialAdapterResult {
  return {
    available: false,
    status: "unavailable",
    published: false,
    reason,
  };
}

function failed(reason: string): SocialAdapterResult {
  return {
    available: true,
    status: "failed",
    published: false,
    reason,
  };
}

function published(videoId: string): SocialAdapterResult {
  return {
    available: true,
    status: "published",
    published: true,
    reason: "published",
    externalId: videoId,
  };
}

async function* iterateUploadChunks(
  media: CreativePublishLoadedMedia,
  maxBytes: number,
): AsyncGenerator<Uint8Array, void, undefined> {
  if (media.mode === "buffer") {
    if (media.byteSize > maxBytes) {
      throw new Error("youtube_upload_size_exceeded");
    }
    for (let offset = 0; offset < media.bytes.byteLength; offset += YOUTUBE_UPLOAD_CHUNK_SIZE) {
      yield media.bytes.subarray(
        offset,
        Math.min(offset + YOUTUBE_UPLOAD_CHUNK_SIZE, media.bytes.byteLength),
      );
    }
    return;
  }

  const reader = media.stream.getReader();
  let buffer = new Uint8Array(0);
  let totalRead = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      totalRead += value.byteLength;
      if (totalRead > maxBytes) {
        throw new Error("youtube_upload_size_exceeded");
      }

      const merged = new Uint8Array(buffer.byteLength + value.byteLength);
      merged.set(buffer, 0);
      merged.set(value, buffer.byteLength);
      buffer = merged;

      while (buffer.byteLength >= YOUTUBE_UPLOAD_CHUNK_SIZE) {
        yield buffer.subarray(0, YOUTUBE_UPLOAD_CHUNK_SIZE);
        buffer = buffer.subarray(YOUTUBE_UPLOAD_CHUNK_SIZE);
      }
    }
    if (buffer.byteLength > 0) {
      yield buffer;
    }
  } finally {
    reader.releaseLock();
  }
}

async function uploadResumableVideoIncremental(input: {
  readonly accessToken: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly chunks: AsyncIterable<Uint8Array>;
  readonly title: string;
  readonly description: string;
  readonly isShort: boolean;
  readonly privacyStatus: ReturnType<typeof getYouTubeDefaultPrivacyStatus>;
  readonly deadlineMs: number;
  readonly deps: YouTubeUploadDeps;
}): Promise<{ videoId: string }> {
  void input.isShort;
  const init = await initializeYouTubeResumableUpload({
    accessToken: input.accessToken,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    title: input.title,
    description: input.description,
    privacyStatus: input.privacyStatus,
    deps: input.deps,
  });

  if (input.deps.now() >= input.deadlineMs) {
    throw new Error("youtube_upload_timeout");
  }

  let offset = 0;
  for await (const chunk of input.chunks) {
    if (input.deps.now() >= input.deadlineMs) {
      throw new Error("youtube_upload_timeout");
    }
    const result = await uploadYouTubeChunk({
      accessToken: input.accessToken,
      uploadUrl: init.uploadUrl,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      offset,
      chunk,
      deps: input.deps,
    });
    if (result.completed && result.videoId) {
      return { videoId: result.videoId };
    }
    offset = result.nextOffset;
  }

  if (input.deps.now() >= input.deadlineMs) {
    throw new Error("youtube_upload_timeout");
  }

  const finalized = await finalizeYouTubeResumableUpload({
    accessToken: input.accessToken,
    uploadUrl: init.uploadUrl,
    byteSize: input.byteSize,
    deps: input.deps,
  });
  return { videoId: finalized.videoId };
}

export async function publishCreativeToYouTube(input: {
  readonly project: CreativeProject;
  readonly target: CreativePublishTarget;
  readonly media: CreativePublishLoadedMedia;
  readonly accessToken: string;
}): Promise<SocialAdapterResult> {
  if (!isYouTubePublishEnabled()) {
    return unavailable("youtube_publish_disabled");
  }

  if (input.target.socialPlatform !== "youtube") {
    return unavailable("unsupported_platform");
  }

  if (
    input.project.creativeType !== "VIDEO_AD" &&
    input.project.creativeType !== "SOCIAL_VIDEO"
  ) {
    return unavailable("video_required");
  }

  const plan = input.project.productionPlan;
  if (
    !plan ||
    (plan.platform !== "youtube" && plan.platform !== "youtube_shorts")
  ) {
    return unavailable("unsupported_youtube_plan");
  }

  const deps = resolveDeps();
  const maxBytes = getCreativeBlobConfig().videoMaxBytes;
  if (input.media.byteSize > maxBytes) {
    return failed("youtube_upload_size_exceeded");
  }
  const deadlineMs = deps.now() + getYouTubeUploadMaxDurationMs();

  try {
    const description =
      input.project.brief.cta ||
      input.project.brief.customerRequest ||
      input.project.name;

    const result = await uploadResumableVideoIncremental({
      accessToken: input.accessToken,
      mimeType: input.media.mimeType,
      byteSize: input.media.byteSize,
      chunks: iterateUploadChunks(input.media, maxBytes),
      title: input.project.name,
      description,
      isShort: plan.platform === "youtube_shorts",
      privacyStatus: getYouTubeDefaultPrivacyStatus(),
      deadlineMs,
      deps,
    });

    return published(result.videoId);
  } catch (error) {
    return failed(mapYouTubeUploadError(error));
  }
}

export async function publishYouTubeFromResumableSession(input: {
  readonly accessToken: string;
  readonly uploadUrl: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly startOffset: number;
  readonly title: string;
  readonly description: string;
  readonly readChunk: (offset: number, maxLength: number) => Promise<Uint8Array>;
  readonly onProgress?: (offset: number) => Promise<void>;
  readonly maxChunks?: number;
  readonly deadlineMs?: number;
}): Promise<SocialAdapterResult> {
  const deps = resolveDeps();
  try {
    const result = await resumeYouTubeUploadFromOffset({
      accessToken: input.accessToken,
      uploadUrl: input.uploadUrl,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      startOffset: input.startOffset,
      deps,
      deadlineMs: input.deadlineMs,
      maxChunks: input.maxChunks,
      readChunk: async (offset, maxLength) => {
        const chunk = await input.readChunk(offset, maxLength);
        if (input.onProgress) {
          await input.onProgress(offset + chunk.byteLength);
        }
        return chunk;
      },
    });

    if (result.completed && result.videoId) {
      return published(result.videoId);
    }

    if (result.nextOffset >= input.byteSize) {
      const finalized = await finalizeYouTubeResumableUpload({
        accessToken: input.accessToken,
        uploadUrl: input.uploadUrl,
        byteSize: input.byteSize,
        deps,
      });
      return published(finalized.videoId);
    }

    return {
      available: true,
      status: "failed",
      published: false,
      reason: "youtube_upload_incomplete",
    };
  } catch (error) {
    return failed(mapYouTubeUploadError(error));
  }
}
