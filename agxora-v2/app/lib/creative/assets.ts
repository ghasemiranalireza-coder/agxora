/**
 * Phase 59.1 / Phase 60 — bounded creative asset URL helpers.
 * Never persist unbounded base64/data URLs into Agent OS v7.
 */

import type { CreativeAssetRef } from "@/features/agents/creative/types";
import { parseDurableCreativeAssetUrl } from "./assetStorePaths";

/** Hard ceiling on a single image asset data URL string (chars). Fail closed above. */
export const MAX_CREATIVE_ASSET_DATA_URL_CHARS = 400_000;

/** Phase 62 — video data URLs may be larger but are never persisted to Agent OS. */
export const MAX_CREATIVE_VIDEO_DATA_URL_CHARS = 140_000_000;

/** Approximate max decoded bytes implied by the data-URL ceiling. */
export const MAX_CREATIVE_ASSET_DECODED_BYTES = 300_000;

/** Phase 60 — one primary IMAGE_AD asset per creative. */
export const MAX_PRIMARY_ASSETS_PER_CREATIVE = 1;

/** Phase 62 — default video byte ceiling (override via AGXORA_CREATIVE_VIDEO_MAX_BYTES). */
export const MAX_CREATIVE_VIDEO_DECODED_BYTES = 104_857_600;

/** Allowed image MIME types for durable storage (derived from Phase 59 image path). */
export const ALLOWED_CREATIVE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

/** Allowed video MIME types for Phase 62 object storage. */
export const ALLOWED_CREATIVE_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const;

export type AllowedCreativeImageMimeType =
  (typeof ALLOWED_CREATIVE_IMAGE_MIME_TYPES)[number];

export type AllowedCreativeVideoMimeType =
  (typeof ALLOWED_CREATIVE_VIDEO_MIME_TYPES)[number];

export function isAllowedCreativeImageMimeType(
  mimeType: string | undefined,
): mimeType is AllowedCreativeImageMimeType {
  if (!mimeType) return false;
  const normalized = mimeType.trim().toLowerCase();
  return (ALLOWED_CREATIVE_IMAGE_MIME_TYPES as readonly string[]).includes(
    normalized,
  );
}

export function isAllowedCreativeVideoMimeType(
  mimeType: string | undefined,
): mimeType is AllowedCreativeVideoMimeType {
  if (!mimeType) return false;
  const normalized = mimeType.trim().toLowerCase();
  return (ALLOWED_CREATIVE_VIDEO_MIME_TYPES as readonly string[]).includes(
    normalized,
  );
}

export function isVideoCreativeMimeType(mimeType: string | undefined): boolean {
  return isAllowedCreativeVideoMimeType(mimeType);
}

export function isDurableCreativeAssetUrl(url: string): boolean {
  return parseDurableCreativeAssetUrl(url) !== null;
}

export function isUsableCreativeAssetUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("https://")) return true;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("data:video/")) return true;
  if (isDurableCreativeAssetUrl(trimmed)) return true;
  // Disallow plain http: — not accepted for persisted/returned creative assets.
  return false;
}

/**
 * Returns null when the asset is usable and within size bounds.
 * Returns a stable reason code when it must be rejected.
 */
export function validateCreativeAssetUrl(url: string): string | null {
  if (!isUsableCreativeAssetUrl(url)) {
    return "provider_returned_unusable_asset_url";
  }
  if (url.startsWith("data:image/") && url.length > MAX_CREATIVE_ASSET_DATA_URL_CHARS) {
    return "provider_asset_too_large";
  }
  if (url.startsWith("data:video/") && url.length > MAX_CREATIVE_VIDEO_DATA_URL_CHARS) {
    return "provider_asset_too_large";
  }
  if (url.startsWith("data:image/")) {
    const comma = url.indexOf(",");
    const payload = comma >= 0 ? url.slice(comma + 1) : "";
    // base64 expands ~4/3; reject when payload alone exceeds char ceiling.
    if (payload.length > MAX_CREATIVE_ASSET_DATA_URL_CHARS) {
      return "provider_asset_too_large";
    }
    const approxDecoded = Math.floor((payload.length * 3) / 4);
    if (approxDecoded > MAX_CREATIVE_ASSET_DECODED_BYTES) {
      return "provider_asset_too_large";
    }
  }
  if (url.startsWith("data:video/")) {
    const comma = url.indexOf(",");
    const payload = comma >= 0 ? url.slice(comma + 1) : "";
    if (payload.length > MAX_CREATIVE_VIDEO_DATA_URL_CHARS) {
      return "provider_asset_too_large";
    }
    const approxDecoded = Math.floor((payload.length * 3) / 4);
    if (approxDecoded > MAX_CREATIVE_VIDEO_DECODED_BYTES) {
      return "provider_asset_too_large";
    }
  }
  return null;
}

/**
 * Strip binary data URLs before Agent OS persistence.
 * Keeps durable app URLs + metadata. HTTPS provider URLs kept only if still present
 * (Phase 60 prefers durable app URLs after store.put).
 */
export function sanitizeAssetsForPersistence(
  assets: readonly CreativeAssetRef[],
): readonly CreativeAssetRef[] {
  return assets.map((asset) => {
    const url = typeof asset.url === "string" ? asset.url : undefined;
    if (url && (url.startsWith("data:image/") || url.startsWith("data:video/"))) {
      return {
        providerId: asset.providerId,
        providerAssetId: asset.providerAssetId,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        durationMs: asset.durationMs,
        // Intentionally omit data URL from persisted Agent OS state.
      };
    }
    if (url && !isUsableCreativeAssetUrl(url)) {
      return {
        providerId: asset.providerId,
        providerAssetId: asset.providerAssetId,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        durationMs: asset.durationMs,
      };
    }
    return asset;
  });
}

/** True when the creative already has a durable primary asset URL. */
export function hasDurablePrimaryAsset(
  assets: readonly CreativeAssetRef[] | undefined,
): boolean {
  if (!assets || assets.length === 0) return false;
  return assets.some(
    (asset) =>
      typeof asset.url === "string" && isDurableCreativeAssetUrl(asset.url),
  );
}
