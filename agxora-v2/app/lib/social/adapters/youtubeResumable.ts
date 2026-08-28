/**
 * Phase 65.0 — YouTube resumable upload primitives (reusable sync + async paths).
 */

import "server-only";

import {
  getYouTubeDefaultPrivacyStatus,
  type YouTubePrivacyStatus,
} from "../config";

export const YOUTUBE_UPLOAD_CHUNK_SIZE = 256 * 1024;

export type YouTubeResumableDeps = {
  readonly now: () => number;
  readonly fetch: typeof fetch;
};

let depsOverride: YouTubeResumableDeps | null = null;

/** Test-only dependency injection for clocks and fetch. */
export function setYouTubeResumableDepsForTests(deps: YouTubeResumableDeps | null): void {
  depsOverride = deps;
}

export function resolveYouTubeResumableDeps(): YouTubeResumableDeps {
  return depsOverride ?? { now: () => Date.now(), fetch: globalThis.fetch };
}

export type YouTubeResumableInitInput = {
  readonly accessToken: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly title: string;
  readonly description: string;
  readonly privacyStatus?: YouTubePrivacyStatus;
  readonly deps: YouTubeResumableDeps;
};

export type YouTubeResumableInitResult = {
  readonly uploadUrl: string;
};

export async function initializeYouTubeResumableUpload(
  input: YouTubeResumableInitInput,
): Promise<YouTubeResumableInitResult> {
  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5000),
    },
    status: {
      privacyStatus: input.privacyStatus ?? getYouTubeDefaultPrivacyStatus(),
      selfDeclaredMadeForKids: false,
    },
  };

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

  return { uploadUrl };
}

export type YouTubeUploadChunkInput = {
  readonly accessToken: string;
  readonly uploadUrl: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly offset: number;
  readonly chunk: Uint8Array;
  readonly deps: YouTubeResumableDeps;
};

export type YouTubeUploadChunkResult = {
  readonly nextOffset: number;
  readonly completed: boolean;
  readonly videoId?: string;
};

export async function uploadYouTubeChunk(
  input: YouTubeUploadChunkInput,
): Promise<YouTubeUploadChunkResult> {
  const end = input.offset + input.chunk.byteLength - 1;
  const isFinal = end + 1 >= input.byteSize;

  const putResponse = await input.deps.fetch(input.uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Length": String(input.chunk.byteLength),
      "Content-Type": input.mimeType,
      "Content-Range": `bytes ${input.offset}-${end}/${input.byteSize}`,
    },
    body: Buffer.from(input.chunk),
  });

  if (putResponse.status === 308 || (!isFinal && putResponse.ok)) {
    return { nextOffset: input.offset + input.chunk.byteLength, completed: false };
  }

  if (isFinal && putResponse.ok) {
    const payload = (await putResponse.json()) as { id?: string };
    if (!payload.id) {
      throw new Error("youtube_missing_video_id");
    }
    return {
      nextOffset: input.byteSize,
      completed: true,
      videoId: payload.id,
    };
  }

  throw new Error("youtube_chunk_upload_failed");
}

export async function finalizeYouTubeResumableUpload(input: {
  readonly accessToken: string;
  readonly uploadUrl: string;
  readonly byteSize: number;
  readonly deps: YouTubeResumableDeps;
}): Promise<{ videoId: string }> {
  const completeResponse = await input.deps.fetch(input.uploadUrl, {
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
  return { videoId: payload.id };
}

export async function resumeYouTubeUploadFromOffset(input: {
  readonly accessToken: string;
  readonly uploadUrl: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly startOffset: number;
  readonly readChunk: (offset: number, maxLength: number) => Promise<Uint8Array>;
  readonly deps: YouTubeResumableDeps;
  readonly deadlineMs?: number;
  readonly maxChunks?: number;
}): Promise<{ nextOffset: number; completed: boolean; videoId?: string }> {
  let offset = input.startOffset;
  let chunksUploaded = 0;
  const maxChunks = input.maxChunks ?? Number.POSITIVE_INFINITY;

  while (offset < input.byteSize && chunksUploaded < maxChunks) {
    if (input.deadlineMs !== undefined && input.deps.now() >= input.deadlineMs) {
      throw new Error("youtube_upload_timeout");
    }

    const remaining = input.byteSize - offset;
    const chunkSize = Math.min(YOUTUBE_UPLOAD_CHUNK_SIZE, remaining);
    const chunk = await input.readChunk(offset, chunkSize);
    if (chunk.byteLength === 0) {
      throw new Error("youtube_upload_failed");
    }

    const result = await uploadYouTubeChunk({
      accessToken: input.accessToken,
      uploadUrl: input.uploadUrl,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      offset,
      chunk,
      deps: input.deps,
    });

    offset = result.nextOffset;
    chunksUploaded += 1;

    if (result.completed) {
      return { nextOffset: offset, completed: true, videoId: result.videoId };
    }
  }

  return { nextOffset: offset, completed: false };
}

export const KNOWN_YOUTUBE_UPLOAD_FAILURE_REASONS = new Set([
  "youtube_resumable_init_failed",
  "youtube_resumable_missing_location",
  "youtube_chunk_upload_failed",
  "youtube_upload_finalize_failed",
  "youtube_missing_video_id",
  "youtube_upload_timeout",
  "youtube_upload_size_exceeded",
  "youtube_upload_session_expired",
  "youtube_upload_failed",
]);

export function mapYouTubeUploadError(error: unknown): string {
  if (error instanceof Error && KNOWN_YOUTUBE_UPLOAD_FAILURE_REASONS.has(error.message)) {
    return error.message;
  }
  return "youtube_upload_failed";
}
