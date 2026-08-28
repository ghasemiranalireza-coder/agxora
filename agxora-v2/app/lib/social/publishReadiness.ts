/**
 * Phase 64.0 — YouTube publish production readiness (server-only, no secrets).
 */

import "server-only";

import { getCreativeBlobConfig } from "@/app/lib/creative/blobStore/config";
import {
  getYouTubeOAuthConfig,
  isYouTubeAsyncUploadEnabled,
  isYouTubePublishEnabled,
} from "./config";
import {
  isCreativePublishSchedulerConfigured,
  isCreativePublishWorkerConfigured,
} from "@/app/lib/creative/publishWorkerAuth";

export type PublishReadinessIssueCode =
  | "youtube_oauth_not_configured"
  | "social_oauth_encryption_key"
  | "creative_blob_store_not_s3"
  | "creative_blob_s3_not_configured"
  | "creative_publish_worker_not_configured"
  | "creative_publish_scheduler_not_configured";

export type PublishReadinessIssue = {
  readonly code: PublishReadinessIssueCode;
  readonly message: string;
};

export type PublishReadinessResult = {
  /** True when AGXORA_YOUTUBE_PUBLISH_ENABLED is on. */
  readonly enabled: boolean;
  readonly ready: boolean;
  readonly issues: readonly PublishReadinessIssue[];
};

function isSocialOAuthEncryptionKeyConfigured(): boolean {
  const raw = process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY?.trim();
  if (!raw) return false;
  try {
    const decoded = Buffer.from(raw, raw.length === 64 ? "hex" : "base64");
    return decoded.byteLength === 32;
  } catch {
    return false;
  }
}

/**
 * Evaluate YouTube publish readiness. When publishing is disabled, returns
 * enabled=false and ready=true (no false production failure).
 */
export function evaluateYouTubePublishReadiness(): PublishReadinessResult {
  const enabled = isYouTubePublishEnabled();
  if (!enabled) {
    return { enabled: false, ready: true, issues: [] };
  }

  const issues: PublishReadinessIssue[] = [];

  if (!getYouTubeOAuthConfig()) {
    issues.push({
      code: "youtube_oauth_not_configured",
      message:
        "YouTube OAuth requires AGXORA_YOUTUBE_OAUTH_CLIENT_ID, AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET, and AGXORA_YOUTUBE_OAUTH_REDIRECT_URI",
    });
  }

  if (!isSocialOAuthEncryptionKeyConfigured()) {
    issues.push({
      code: "social_oauth_encryption_key",
      message:
        "AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY must be set to a 32-byte base64 or 64-char hex value",
    });
  }

  const blobConfig = getCreativeBlobConfig();
  if (blobConfig.store !== "s3") {
    issues.push({
      code: "creative_blob_store_not_s3",
      message:
        "Video publish requires AGXORA_CREATIVE_BLOB_STORE=s3 for durable object storage",
    });
  } else if (!blobConfig.s3) {
    issues.push({
      code: "creative_blob_s3_not_configured",
      message:
        "S3-compatible blob store requires AGXORA_CREATIVE_BLOB_S3_BUCKET and credentials",
    });
  }

  if (isYouTubeAsyncUploadEnabled() && !isCreativePublishWorkerConfigured()) {
    issues.push({
      code: "creative_publish_worker_not_configured",
      message:
        "Async YouTube upload requires AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN for the trusted worker endpoint",
    });
  }

  if (
    isYouTubeAsyncUploadEnabled() &&
    isCreativePublishWorkerConfigured() &&
    !isCreativePublishSchedulerConfigured()
  ) {
    issues.push({
      code: "creative_publish_scheduler_not_configured",
      message:
        "Async YouTube upload requires AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED=true with platform cron hitting /api/v1/internal/creative/publish/worker",
    });
  }

  return {
    enabled,
    ready: issues.length === 0,
    issues,
  };
}
