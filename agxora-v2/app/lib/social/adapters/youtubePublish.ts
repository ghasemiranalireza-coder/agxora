/**
 * Phase 63.1 / 64.0 — YouTube creative publish adapter (env-gated, video-only).
 * Phase 64: incremental stream upload, size/duration guards, stable error codes.
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

const CHUNK_SIZE = 256 * 1024;

export type YouTubeUploadDeps = {
  readonly now: () => number;
  readonly fetch: typeof fetch;
};

let depsOverride: YouTubeUploadDeps | null = null;

/** Test-only dependency injection for clocks and fetch. */
export function setYouTubeUploadDepsForTests(deps: YouTubeUploadDeps | null): void {
  depsOverride = deps;
}

function resolveDeps(): YouTubeUploadDeps {
  return depsOverride ?? { now: () => Date.now(), fetch: globalThis.fetch };
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

function assertUploadDeadline(deadlineMs: number, now: () => number): void {
  if (now() >= deadlineMs) {
    throw new Error("youtube_upload_timeout");
  }
}

async function* iterateUploadChunks(
  media: CreativePublishLoadedMedia,
  maxBytes: number,
): AsyncGenerator<Uint8Array, void, undefined> {
  if (media.mode === "buffer") {
    if (media.byteSize > maxBytes) {
      throw new Error("youtube_upload_size_exceeded");
    }
    for (let offset = 0; offset < media.bytes.byteLength; offset += CHUNK_SIZE) {
      yield media.bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, media.bytes.byteLength));
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

      while (buffer.byteLength >= CHUNK_SIZE) {
        yield buffer.subarray(0, CHUNK_SIZE);
        buffer = buffer.subarray(CHUNK_SIZE);
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
  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5000),
    },
    status: {
      privacyStatus: input.privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  assertUploadDeadline(input.deadlineMs, input.deps.now);

  const initResponse = await input.deps.fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType,
        "X-Upload-Content-Length": String(input.byteSize),
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initResponse.ok) {
    throw new Error("youtube_resumable_init_failed");
  }

  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("youtube_resumable_missing_location");
  }

  let offset = 0;
  for await (const chunk of input.chunks) {
    assertUploadDeadline(input.deadlineMs, input.deps.now);

    const end = offset + chunk.byteLength - 1;
    const putResponse = await input.deps.fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Length": String(chunk.byteLength),
        "Content-Type": input.mimeType,
        "Content-Range": `bytes ${offset}-${end}/${input.byteSize}`,
      },
      body: Buffer.from(chunk),
    });
    if (putResponse.status !== 308 && !putResponse.ok) {
      throw new Error("youtube_chunk_upload_failed");
    }
    offset += chunk.byteLength;
  }

  assertUploadDeadline(input.deadlineMs, input.deps.now);

  const completeResponse = await input.deps.fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Length": "0",
      "Content-Range": `bytes */${input.byteSize}`,
    },
  });
  if (!completeResponse.ok) {
    throw new Error("youtube_upload_finalize_failed");
  }

  const payload = (await completeResponse.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("youtube_missing_video_id");
  }

  void input.isShort;
  return { videoId: payload.id };
}

const KNOWN_UPLOAD_FAILURE_REASONS = new Set([
  "youtube_resumable_init_failed",
  "youtube_resumable_missing_location",
  "youtube_chunk_upload_failed",
  "youtube_upload_finalize_failed",
  "youtube_missing_video_id",
  "youtube_upload_timeout",
  "youtube_upload_size_exceeded",
]);

function mapUploadError(error: unknown): string {
  if (error instanceof Error && KNOWN_UPLOAD_FAILURE_REASONS.has(error.message)) {
    return error.message;
  }
  return "youtube_upload_failed";
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

    return {
      available: true,
      status: "published",
      published: true,
      reason: "published",
      externalId: result.videoId,
    };
  } catch (error) {
    return failed(mapUploadError(error));
  }
}
