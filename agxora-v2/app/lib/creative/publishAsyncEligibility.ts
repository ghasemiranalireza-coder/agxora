/**
 * Phase 65.0 — async YouTube publish eligibility (server-only).
 */

import "server-only";

import type { CreativeAssetRecord } from "./assetStore";
import type { CreativePublishTarget } from "./platformMap";
import { isVideoCreativeMimeType } from "./assets";
import {
  getYouTubeAsyncUploadThresholdBytes,
  isYouTubeAsyncUploadEnabled,
} from "@/app/lib/social/config";

export function isAsyncYouTubePublishEligible(input: {
  readonly target: CreativePublishTarget;
  readonly asset: CreativeAssetRecord;
}): boolean {
  if (!isYouTubeAsyncUploadEnabled()) return false;
  if (input.target.socialPlatform !== "youtube") return false;
  if (input.asset.storageBackend !== "object_s3" || !input.asset.objectKey) return false;
  if (!isVideoCreativeMimeType(input.asset.mimeType)) return false;
  return input.asset.byteSize >= getYouTubeAsyncUploadThresholdBytes();
}
