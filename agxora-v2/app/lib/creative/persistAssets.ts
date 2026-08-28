/**
 * Phase 60 / 60.1 — materialize provider assets into the durable CreativeAssetStore.
 * Provider success without a successful put must not become durable COMPLETED.
 */

import "server-only";

import type { CreativeAssetRef } from "@/features/agents/creative/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  ALLOWED_CREATIVE_IMAGE_MIME_TYPES,
  MAX_CREATIVE_ASSET_DECODED_BYTES,
  MAX_PRIMARY_ASSETS_PER_CREATIVE,
  isAllowedCreativeImageMimeType,
  isDurableCreativeAssetUrl,
  validateCreativeAssetUrl,
} from "./assets";
import {
  buildDurableCreativeAssetUrl,
  getCreativeAssetStore,
  type CreativeAssetStore,
} from "./assetStore";
import { parseDurableCreativeAssetUrl } from "./assetStorePaths";
import { fetchTrustedHttpsAsset } from "./httpsAssetFetch";

function newAssetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `casset_${crypto.randomUUID()}`;
  }
  return `casset_${Date.now().toString(36)}`;
}

function mimeFromDataUrl(dataUrl: string): string | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(dataUrl);
  if (!match?.[1]) return null;
  const mime = match[1].toLowerCase();
  if (mime === "image/jpg") return "image/jpeg";
  return mime;
}

function decodeDataUrl(dataUrl: string): {
  mimeType: string;
  bytes: Uint8Array;
} {
  const reason = validateCreativeAssetUrl(dataUrl);
  if (reason) {
    throw new PersistenceError("validation", reason, {
      details: [{ field: "url", message: reason }],
    });
  }
  const mimeType = mimeFromDataUrl(dataUrl);
  if (!mimeType || !isAllowedCreativeImageMimeType(mimeType)) {
    throw new PersistenceError("validation", "Unsupported creative asset MIME type", {
      details: [
        {
          field: "mimeType",
          message: `allowed:${ALLOWED_CREATIVE_IMAGE_MIME_TYPES.join(",")}`,
        },
      ],
    });
  }
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : "";
  if (!payload) {
    throw new PersistenceError("validation", "Asset bytes are empty", {
      details: [{ field: "bytes", message: "empty" }],
    });
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(payload, "base64"));
  } catch {
    throw new PersistenceError("validation", "Invalid base64 asset payload", {
      details: [{ field: "bytes", message: "invalid_base64" }],
    });
  }
  if (bytes.byteLength === 0) {
    throw new PersistenceError("validation", "Asset bytes are empty", {
      details: [{ field: "bytes", message: "empty" }],
    });
  }
  if (bytes.byteLength > MAX_CREATIVE_ASSET_DECODED_BYTES) {
    throw new PersistenceError("validation", "Asset exceeds size limit", {
      details: [{ field: "bytes", message: "provider_asset_too_large" }],
    });
  }
  return { mimeType, bytes };
}

async function resolveExistingDurableAsset(
  store: CreativeAssetStore,
  organizationId: string,
  creativeProjectId: string,
  url: string,
): Promise<readonly CreativeAssetRef[] | null> {
  const parsed = parseDurableCreativeAssetUrl(url);
  if (!parsed) return null;
  if (parsed.creativeProjectId !== creativeProjectId) return null;

  const record = await store.get({
    organizationId,
    creativeProjectId,
    assetId: parsed.assetId,
  });
  if (!record) return null;
  if (record.organizationId !== organizationId) return null;
  if (record.creativeProjectId !== creativeProjectId) return null;

  const durableUrl = buildDurableCreativeAssetUrl(
    creativeProjectId,
    parsed.assetId,
  );
  return [
    {
      providerId: record.providerId ?? "stored",
      providerAssetId: record.providerAssetId ?? parsed.assetId,
      url: durableUrl,
      mimeType: record.mimeType,
      width: record.width,
      height: record.height,
    },
  ];
}

export type PersistDurableAssetsInput = {
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly providerId: string;
  readonly assets: readonly CreativeAssetRef[];
  /**
   * When true, replacement uses upsert on (organizationId, creativeProjectId).
   * Phase 60.1: never deletes the existing primary before put succeeds.
   */
  readonly replaceExisting: boolean;
};

export type PersistDurableAssetsResult =
  | {
      readonly ok: true;
      readonly durableAssets: readonly CreativeAssetRef[];
      /** Session preview may still include data URLs when available. */
      readonly previewAssets: readonly CreativeAssetRef[];
    }
  | {
      readonly ok: false;
      readonly reason: string;
    };

function mapPersistenceFailure(error: PersistenceError): string {
  const detail = error.details?.[0]?.message;
  if (detail === "provider_asset_too_large") return "provider_asset_too_large";
  if (detail === "provider_asset_url_not_trusted") {
    return "provider_asset_url_not_trusted";
  }
  if (detail === "empty" || detail === "invalid_base64") {
    return "provider_returned_no_assets";
  }
  if (detail === "unsupported") return "creative_asset_storage_failed";
  return "creative_asset_storage_failed";
}

/**
 * Store the first usable IMAGE_AD asset as the durable primary.
 * Returns durable URL refs for Agent OS; never returns data:image URLs.
 */
export async function persistProviderAssetsDurably(
  input: PersistDurableAssetsInput,
): Promise<PersistDurableAssetsResult> {
  const store = getCreativeAssetStore();
  const candidates = input.assets.filter(
    (asset) => typeof asset.url === "string" && asset.url.length > 0,
  );
  if (candidates.length === 0) {
    return { ok: false, reason: "provider_returned_no_assets" };
  }

  // Phase 60: one primary asset only.
  const primary = candidates[0]!;
  const previewAssets = candidates.slice(0, MAX_PRIMARY_ASSETS_PER_CREATIVE);

  try {
    void input.replaceExisting;

    let mimeType = primary.mimeType;
    let bytes: Uint8Array;

    if (primary.url!.startsWith("data:image/")) {
      const decoded = decodeDataUrl(primary.url!);
      mimeType = decoded.mimeType;
      bytes = decoded.bytes;
    } else if (primary.url!.startsWith("https://")) {
      const fetched = await fetchTrustedHttpsAsset(primary.url!);
      mimeType =
        primary.mimeType && isAllowedCreativeImageMimeType(primary.mimeType)
          ? primary.mimeType
          : fetched.mimeType;
      bytes = fetched.bytes;
    } else if (isDurableCreativeAssetUrl(primary.url!)) {
      const existing = await resolveExistingDurableAsset(
        store,
        input.organizationId,
        input.creativeProjectId,
        primary.url!,
      );
      if (!existing) {
        return { ok: false, reason: "creative_asset_not_durable" };
      }
      return {
        ok: true,
        durableAssets: existing,
        previewAssets: existing,
      };
    } else {
      return { ok: false, reason: "provider_returned_unusable_asset_url" };
    }

    const assetId = newAssetId();
    // Upsert replaces primary in place — never delete before put (Phase 60.1).
    await store.put({
      organizationId: input.organizationId,
      creativeProjectId: input.creativeProjectId,
      assetId,
      mimeType: mimeType ?? "image/jpeg",
      bytes,
      width: primary.width,
      height: primary.height,
      providerId: primary.providerId || input.providerId,
      providerAssetId: primary.providerAssetId,
    });

    const durableUrl = buildDurableCreativeAssetUrl(
      input.creativeProjectId,
      assetId,
    );
    const durableAsset: CreativeAssetRef = {
      providerId: primary.providerId || input.providerId,
      providerAssetId: primary.providerAssetId ?? assetId,
      url: durableUrl,
      mimeType: mimeType ?? primary.mimeType,
      width: primary.width,
      height: primary.height,
      durationMs: primary.durationMs,
    };

    return {
      ok: true,
      durableAssets: [durableAsset],
      previewAssets: previewAssets.map((asset, index) =>
        index === 0
          ? {
              ...asset,
              url: asset.url?.startsWith("data:image/")
                ? asset.url
                : durableUrl,
              mimeType: durableAsset.mimeType,
            }
          : asset,
      ),
    };
  } catch (error) {
    if (error instanceof PersistenceError) {
      return { ok: false, reason: mapPersistenceFailure(error) };
    }
    return { ok: false, reason: "creative_asset_storage_failed" };
  }
}
