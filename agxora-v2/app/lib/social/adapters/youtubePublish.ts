/**
 * Phase 63.1 — YouTube creative publish adapter (env-gated, video-only).
 */

import "server-only";

import type { CreativeProject } from "@/features/agents/creative/types";
import type { SocialAdapterResult } from "@/features/agents/social/types";
import type { CreativePublishLoadedMedia } from "@/app/lib/creative/loadCreativeAssetMedia";
import type { CreativePublishTarget } from "@/app/lib/creative/platformMap";
import { isYouTubePublishEnabled } from "../config";

const CHUNK_SIZE = 256 * 1024;

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

async function readStreamToChunks(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array[]> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
    }
  }
  return chunks;
}

async function uploadResumableVideo(input: {
  readonly accessToken: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly chunks: readonly Uint8Array[];
  readonly title: string;
  readonly description: string;
  readonly isShort: boolean;
}): Promise<{ videoId: string }> {
  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5000),
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
    },
  };

  const initResponse = await fetch(
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
  for (const chunk of input.chunks) {
    const end = offset + chunk.byteLength - 1;
    const putResponse = await fetch(uploadUrl, {
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

  const completeResponse = await fetch(uploadUrl, {
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

  try {
    let chunks: Uint8Array[];
    if (input.media.mode === "buffer") {
      chunks = [];
      for (let offset = 0; offset < input.media.bytes.byteLength; offset += CHUNK_SIZE) {
        chunks.push(input.media.bytes.subarray(offset, offset + CHUNK_SIZE));
      }
    } else {
      const all = await readStreamToChunks(input.media.stream);
      chunks = [];
      let buffer = new Uint8Array(0);
      for (const part of all) {
        const merged = new Uint8Array(buffer.byteLength + part.byteLength);
        merged.set(buffer, 0);
        merged.set(part, buffer.byteLength);
        buffer = merged;
        while (buffer.byteLength >= CHUNK_SIZE) {
          chunks.push(buffer.subarray(0, CHUNK_SIZE));
          buffer = buffer.subarray(CHUNK_SIZE);
        }
      }
      if (buffer.byteLength > 0) chunks.push(buffer);
    }

    const description =
      input.project.brief.cta ||
      input.project.brief.customerRequest ||
      input.project.name;

    const result = await uploadResumableVideo({
      accessToken: input.accessToken,
      mimeType: input.media.mimeType,
      byteSize: input.media.byteSize,
      chunks,
      title: input.project.name,
      description,
      isShort: plan.platform === "youtube_shorts",
    });

    return {
      available: true,
      status: "published",
      published: true,
      reason: "published",
      externalId: result.videoId,
    };
  } catch {
    return failed("youtube_upload_failed");
  }
}
