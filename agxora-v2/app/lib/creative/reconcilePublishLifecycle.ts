/**
 * Phase 67.0 — server-side creative publish terminal reconciliation.
 */

import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativePublishResult } from "@/features/agents/creative/types";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import {
  completeCreativePublishAttempt,
  getCreativePublishAttemptById,
  mapPublishResultToAttemptStatus,
  type PublishAttemptRecord,
} from "./publishIdempotency";
import { persistPublishResultForActor } from "./persistPublishResult";
import { isTerminalCreativePublishResult } from "./publishExecutionOutcome";
import {
  listYouTubeUploadSessionsNeedingTerminalReconciliation,
  type YouTubeUploadSessionRecord,
} from "./youtubeUploadSession";

export function buildWorkerActorFromSession(
  session: YouTubeUploadSessionRecord,
): Actor {
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

export function toTerminalFailedPublishResult(input: {
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

function attemptNeedsTerminalReconciliation(
  attempt: PublishAttemptRecord | null,
  publishResult: CreativePublishResult,
): boolean {
  if (!attempt) return true;
  if (attempt.status === "succeeded") return false;
  if (attempt.status === "failed") {
    const existing = attempt.publishResult;
    return (
      existing?.status !== "failed" ||
      existing.reason !== publishResult.reason
    );
  }
  return attempt.status === "uploading" || attempt.status === "in_flight";
}

function projectNeedsTerminalReconciliation(
  state: AgentsPersistedState,
  session: YouTubeUploadSessionRecord,
  publishResult: CreativePublishResult,
): boolean {
  const project = state.creativeProjects.find(
    (item) =>
      item.id === session.creativeProjectId &&
      item.organizationId === session.organizationId,
  );
  if (!project?.publishResult) return true;
  if (project.publishResult.status !== "uploading") {
    return (
      project.publishResult.status === "failed" &&
      project.publishResult.reason !== publishResult.reason
    );
  }
  return true;
}

function jobNeedsTerminalReconciliation(
  state: AgentsPersistedState,
  session: YouTubeUploadSessionRecord,
  publishResult: CreativePublishResult,
): boolean {
  const job = state.executionJobs.find(
    (item) =>
      item.id === session.publishExecutionJobId &&
      item.organizationId === session.organizationId,
  );
  if (!job) return true;
  if (job.status === "COMPLETED" || job.status === "FAILED") {
    return job.result?.message !== publishResult.reason;
  }
  return job.status === "VERIFYING" || job.status === "RUNNING";
}

/**
 * Idempotently persist a terminal publish outcome for a session-bound job.
 * Returns true when state was updated, false when already terminal.
 */
export async function persistTerminalCreativePublishForSession(
  session: YouTubeUploadSessionRecord,
  publishResult: CreativePublishResult,
  input?: {
    readonly attempt?: PublishAttemptRecord | null;
    readonly errorReason?: string;
    readonly currentState?: AgentsPersistedState;
  },
): Promise<boolean> {
  if (!isTerminalCreativePublishResult(publishResult)) {
    return false;
  }

  const actor = buildWorkerActorFromSession(session);
  const state = input?.currentState ?? (await getAgentOsStateForActor(actor));
  const attempt =
    input?.attempt ??
    (await getCreativePublishAttemptById(
      session.organizationId,
      session.publishAttemptId,
    ));

  const needsAttempt = attemptNeedsTerminalReconciliation(attempt, publishResult);
  const needsProject = projectNeedsTerminalReconciliation(state, session, publishResult);
  const needsJob = jobNeedsTerminalReconciliation(state, session, publishResult);

  if (!needsAttempt && !needsProject && !needsJob) {
    return false;
  }

  if (attempt && needsAttempt) {
    await completeCreativePublishAttempt({
      attemptId: attempt.id,
      organizationId: session.organizationId,
      status: mapPublishResultToAttemptStatus(publishResult),
      publishResult,
      externalId: publishResult.externalId,
      errorReason: input?.errorReason ?? publishResult.reason,
    });
  }

  if (needsProject || needsJob) {
    await persistPublishResultForActor(
      actor,
      {
        creativeProjectId: session.creativeProjectId,
        publishExecutionJobId: session.publishExecutionJobId,
        publishResult,
      },
      state,
    );
  }

  return true;
}

export async function reconcileExpiredYouTubeUploadSessions(
  limit = 50,
): Promise<number> {
  const sessions = await listYouTubeUploadSessionsNeedingTerminalReconciliation(limit);
  let reconciled = 0;

  for (const session of sessions) {
    const reason =
      session.errorReason ??
      (session.status === "expired"
        ? "youtube_upload_session_expired"
        : "youtube_upload_failed");
    const publishResult = toTerminalFailedPublishResult({
      executionJobId: session.publishExecutionJobId,
      reason,
    });
    const didReconcile = await persistTerminalCreativePublishForSession(
      session,
      publishResult,
      { errorReason: reason },
    );
    if (didReconcile) {
      reconciled += 1;
    }
  }

  return reconciled;
}

export function synthesizeTerminalPublishResultFromSession(
  publishResult: CreativePublishResult,
  session: YouTubeUploadSessionRecord | null | undefined,
): CreativePublishResult {
  if (!session || publishResult.status !== "uploading") {
    return publishResult;
  }
  if (session.status !== "expired" && session.status !== "failed") {
    return publishResult;
  }
  const reason =
    session.errorReason ??
    (session.status === "expired"
      ? "youtube_upload_session_expired"
      : "youtube_upload_failed");
  return {
    ...publishResult,
    available: true,
    status: "failed",
    published: false,
    reason,
    platform: publishResult.platform ?? "youtube",
    contentType: publishResult.contentType ?? "video",
    executionJobId: publishResult.executionJobId ?? session.publishExecutionJobId,
  };
}
