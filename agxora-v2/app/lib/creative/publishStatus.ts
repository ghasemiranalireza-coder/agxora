/**
 * Phase 65.0 — actor-scoped creative publish status lookup.
 */

import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { authorizeCreativePublishFromState } from "./authorizePublish";
import { getCreativePublishAttemptByJobId } from "./publishIdempotency";
import { findYouTubeUploadSessionByPublishJob } from "./youtubeUploadSession";
import type { CreativePublishResult } from "@/features/agents/creative/types";

export type CreativePublishStatusResult = {
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly publishExecutionJobId: string;
  readonly publishResult: CreativePublishResult;
  readonly uploadSession?: {
    readonly status: string;
    readonly byteOffset: number;
    readonly byteSize: number;
    readonly errorReason?: string;
  };
};

export async function getCreativePublishStatusForActor(
  actor: Actor,
  input: {
    readonly creativeProjectId: string;
    readonly publishExecutionJobId: string;
  },
): Promise<CreativePublishStatusResult> {
  if (!input.creativeProjectId?.trim() || !input.publishExecutionJobId?.trim()) {
    throw new PersistenceError("validation", "creativeProjectId and publishExecutionJobId are required");
  }

  const state = await getAgentOsStateForActor(actor);
  const authz = authorizeCreativePublishFromState(
    state,
    actor.organizationId,
    input.creativeProjectId,
  );

  if (authz.job.id !== input.publishExecutionJobId) {
    throw new PersistenceError("forbidden", "Publish job binding mismatch", {
      details: [{ field: "publishExecutionJobId", message: "job_binding_mismatch" }],
    });
  }

  const attempt = await getCreativePublishAttemptByJobId(
    actor.organizationId,
    input.publishExecutionJobId,
  );
  const session = await findYouTubeUploadSessionByPublishJob(
    actor.organizationId,
    input.publishExecutionJobId,
  );

  const publishResult =
    attempt?.publishResult ??
    authz.project.publishResult ??
    ({
      available: false,
      status: "unavailable",
      published: false,
      reason: "publish_not_started",
      executionJobId: input.publishExecutionJobId,
    } satisfies CreativePublishResult);

  return {
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
    publishExecutionJobId: input.publishExecutionJobId,
    publishResult,
    uploadSession: session
      ? {
          status: session.status,
          byteOffset: session.byteOffset,
          byteSize: session.byteSize,
          errorReason: session.errorReason ?? undefined,
        }
      : undefined,
  };
}
