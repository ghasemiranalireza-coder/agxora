/**
 * Phase 67.0 — shared creative_publish ExecutionResult / job status semantics.
 * Used by client Operations reconciliation and server-side Agent OS persistence.
 */

import type {
  ExecutionJob,
  ExecutionJobStatus,
  ExecutionResult,
} from "@/features/agents/execution/jobs";
import type { CreativePublishResult } from "@/features/agents/creative/types";

function readCreativeId(params: Readonly<Record<string, unknown>>): string | undefined {
  const value = params.creativeId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function executionJobStatusFromCreativePublish(
  publishResult: CreativePublishResult,
  currentStatus?: ExecutionJobStatus,
): ExecutionJobStatus {
  if (publishResult.published === true) {
    return "COMPLETED";
  }
  if (publishResult.status === "failed") {
    return "FAILED";
  }
  if (publishResult.status === "uploading") {
    return "VERIFYING";
  }
  return currentStatus ?? "VERIFYING";
}

export function executionResultFromCreativePublish(
  job: ExecutionJob,
  publishResult: CreativePublishResult | undefined,
  creativeId?: string,
): ExecutionResult {
  const resolvedCreativeId =
    creativeId ?? readCreativeId(job.params) ?? "";

  if (publishResult?.published === true && publishResult.available === true) {
    return {
      success: true,
      status: "completed",
      externalEffect: true,
      message: "completed",
      metadata: {
        toolId: job.toolId,
        creativeId: resolvedCreativeId,
        platform: publishResult.platform ?? "",
      },
    };
  }

  if (publishResult?.status === "unavailable") {
    return {
      success: false,
      status: "unavailable",
      externalEffect: false,
      message: publishResult.reason ?? "creative_publish_unavailable",
      metadata: {
        toolId: job.toolId,
        creativeId: resolvedCreativeId,
        reason: publishResult.reason ?? "creative_publish_unavailable",
      },
    };
  }

  if (publishResult?.status === "uploading") {
    return {
      success: false,
      status: "in_progress",
      externalEffect: true,
      message: publishResult.reason ?? "youtube_upload_in_progress",
      metadata: {
        toolId: job.toolId,
        creativeId: resolvedCreativeId,
        platform: publishResult.platform ?? "",
      },
    };
  }

  return {
    success: false,
    status: "failed",
    externalEffect: false,
    message: publishResult?.reason ?? "creative_publish_failed",
    metadata: { toolId: job.toolId, creativeId: resolvedCreativeId },
  };
}

export function isTerminalCreativePublishResult(
  publishResult: CreativePublishResult | undefined,
): boolean {
  if (!publishResult) return false;
  return (
    publishResult.status === "published" ||
    publishResult.status === "failed" ||
    publishResult.status === "unavailable"
  );
}
