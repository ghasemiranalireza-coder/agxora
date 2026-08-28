/**
 * Phase 65.0 — trusted internal creative publish worker.
 */

import "server-only";

import { randomUUID } from "crypto";
import type { Actor } from "@/app/lib/tenancy/types";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { getValidSocialAccessTokenForActor } from "@/app/lib/social/credentials";
import { publishYouTubeFromResumableSession } from "@/app/lib/social/adapters/youtubePublish";
import { getCreativeAssetStore } from "./assetStore";
import { getCreativeBlobStore } from "./blobStore";
import {
  completeCreativePublishAttempt,
  getCreativePublishAttemptById,
  mapPublishResultToAttemptStatus,
} from "./publishIdempotency";
import { persistPublishResultForActor } from "./persistPublishResult";
import type { CreativePublishResult } from "@/features/agents/creative/types";
import {
  claimDueYouTubeUploadSessions,
  completeYouTubeUploadSession,
  expireStaleYouTubeUploadSessions,
  failYouTubeUploadSession,
  resolveYouTubeUploadUrl,
  updateYouTubeUploadSessionProgress,
  type YouTubeUploadSessionRecord,
} from "./youtubeUploadSession";

export type CreativePublishWorkerRunResult = {
  readonly processed: number;
  readonly completed: number;
  readonly failed: number;
  readonly expired: number;
  readonly skipped: number;
};

function buildWorkerActor(session: YouTubeUploadSessionRecord): Actor {
  return {
    userId: session.actorUserId,
    email: "worker@internal.agxora",
    name: "Publish Worker",
    organizationId: session.organizationId,
    workspaceId: "worker",
    membershipId: "worker",
    role: "MEMBER",
    sessionToken: "worker",
  };
}

function toPublishedResult(input: {
  readonly executionJobId: string;
  readonly externalId: string;
}): CreativePublishResult {
  return {
    available: true,
    status: "published",
    published: true,
    reason: "published",
    platform: "youtube",
    contentType: "video",
    externalId: input.externalId,
    externalUrl: `https://www.youtube.com/watch?v=${input.externalId}`,
    publishedAt: new Date().toISOString(),
    executionJobId: input.executionJobId,
  };
}

function toFailedResult(input: {
  readonly executionJobId: string;
  readonly reason: string;
}): CreativePublishResult {
  return {
    available: true,
    status: "failed",
    published: false,
    reason: input.reason,
    platform: "youtube",
    contentType: "video",
    executionJobId: input.executionJobId,
  };
}

function projectCopyFromState(
  session: YouTubeUploadSessionRecord,
  state: Awaited<ReturnType<typeof getAgentOsStateForActor>>,
): { title: string; description: string } {
  const project = state.creativeProjects.find(
    (item) =>
      item.id === session.creativeProjectId &&
      item.organizationId === session.organizationId,
  );
  const title = project?.name ?? "Creative publish";
  const description =
    project?.brief.cta || project?.brief.customerRequest || project?.name || title;
  return { title, description };
}

export async function processYouTubeUploadSession(
  session: YouTubeUploadSessionRecord,
): Promise<"completed" | "failed" | "skipped"> {
  const attempt = await getCreativePublishAttemptById(
    session.organizationId,
    session.publishAttemptId,
  );
  if (!attempt || attempt.organizationId !== session.organizationId) {
    await failYouTubeUploadSession({
      sessionId: session.id,
      organizationId: session.organizationId,
      errorReason: "publish_attempt_not_found",
    });
    return "failed";
  }

  if (attempt.status === "succeeded" && attempt.externalId) {
    await completeYouTubeUploadSession({
      sessionId: session.id,
      organizationId: session.organizationId,
      externalId: attempt.externalId,
    });
    return "completed";
  }

  const assetStore = getCreativeAssetStore();
  const asset = await assetStore.get({
    organizationId: session.organizationId,
    creativeProjectId: session.creativeProjectId,
    assetId: session.assetId,
  });
  if (!asset || asset.storageBackend !== "object_s3" || !asset.objectKey) {
    const reason = "asset_storage_unavailable";
    await failYouTubeUploadSession({
      sessionId: session.id,
      organizationId: session.organizationId,
      errorReason: reason,
    });
    const publishResult = toFailedResult({
      executionJobId: session.publishExecutionJobId,
      reason,
    });
    await completeCreativePublishAttempt({
      attemptId: attempt.id,
      organizationId: session.organizationId,
      status: mapPublishResultToAttemptStatus(publishResult),
      publishResult,
      errorReason: reason,
    });
    return "failed";
  }

  const actor = buildWorkerActor(session);
  const state = await getAgentOsStateForActor(actor);
  const { title, description } = projectCopyFromState(session, state);
  const accessToken = await getValidSocialAccessTokenForActor(actor, "youtube");
  if (!accessToken) {
    const reason = "social_token_refresh_failed";
    await failYouTubeUploadSession({
      sessionId: session.id,
      organizationId: session.organizationId,
      errorReason: reason,
    });
    const publishResult = toFailedResult({
      executionJobId: session.publishExecutionJobId,
      reason,
    });
    await completeCreativePublishAttempt({
      attemptId: attempt.id,
      organizationId: session.organizationId,
      status: mapPublishResultToAttemptStatus(publishResult),
      publishResult,
      errorReason: reason,
    });
    return "failed";
  }

  const uploadUrl = await resolveYouTubeUploadUrl(session);

  const blobStore = getCreativeBlobStore();
  const objectKey = asset.objectKey;

  const adapterResult = await publishYouTubeFromResumableSession({
    accessToken,
    uploadUrl,
    mimeType: session.mimeType,
    byteSize: session.byteSize,
    startOffset: session.byteOffset,
    title,
    description,
    readChunk: async (offset, maxLength) => {
      return blobStore.getObjectBytesRange(objectKey, offset, maxLength);
    },
    onProgress: async (offset) => {
      await updateYouTubeUploadSessionProgress({
        sessionId: session.id,
        organizationId: session.organizationId,
        byteOffset: offset,
        status: "uploading",
      });
    },
  });

  if (!adapterResult.published || !adapterResult.externalId) {
    const reason = adapterResult.reason ?? "youtube_upload_failed";
    await failYouTubeUploadSession({
      sessionId: session.id,
      organizationId: session.organizationId,
      errorReason: reason,
    });
    const publishResult = toFailedResult({
      executionJobId: session.publishExecutionJobId,
      reason,
    });
    await completeCreativePublishAttempt({
      attemptId: attempt.id,
      organizationId: session.organizationId,
      status: mapPublishResultToAttemptStatus(publishResult),
      publishResult,
      errorReason: reason,
    });
    await persistPublishResultForActor(actor, {
      creativeProjectId: session.creativeProjectId,
      publishExecutionJobId: session.publishExecutionJobId,
      publishResult,
    });
    return "failed";
  }

  await completeYouTubeUploadSession({
    sessionId: session.id,
    organizationId: session.organizationId,
    externalId: adapterResult.externalId,
  });

  const publishResult = toPublishedResult({
    executionJobId: session.publishExecutionJobId,
    externalId: adapterResult.externalId,
  });
  await completeCreativePublishAttempt({
    attemptId: attempt.id,
    organizationId: session.organizationId,
    status: mapPublishResultToAttemptStatus(publishResult),
    publishResult,
    externalId: adapterResult.externalId,
    errorReason: undefined,
  });
  await persistPublishResultForActor(actor, {
    creativeProjectId: session.creativeProjectId,
    publishExecutionJobId: session.publishExecutionJobId,
    publishResult,
  });
  return "completed";
}

export async function runCreativePublishWorker(
  maxSessions: number,
): Promise<CreativePublishWorkerRunResult> {
  const expired = await expireStaleYouTubeUploadSessions();
  const claimId = randomUUID();
  const sessions = await claimDueYouTubeUploadSessions({
    limit: maxSessions,
    claimId,
  });

  const summary = {
    processed: 0,
    completed: 0,
    failed: 0,
    expired,
    skipped: 0,
  } satisfies CreativePublishWorkerRunResult;

  for (const session of sessions) {
    summary.processed += 1;
    const outcome = await processYouTubeUploadSession(session);
    if (outcome === "completed") {
      summary.completed += 1;
    } else if (outcome === "failed") {
      summary.failed += 1;
    } else {
      summary.skipped += 1;
    }
  }

  return summary;
}
