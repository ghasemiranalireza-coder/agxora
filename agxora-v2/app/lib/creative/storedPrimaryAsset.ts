/**
 * Phase 61.1 — server-authoritative durable primary asset lookup.
 * Agent OS productionResult is not the sole source of truth for paid-regenerate policy.
 */

import "server-only";

import type { CreativeProductionResult } from "@/features/agents/creative/types";
import {
  buildDurableCreativeAssetUrl,
  getCreativeAssetStore,
  type CreativeAssetRecord,
} from "./assetStore";

export async function getStoredPrimaryCreativeAsset(input: {
  readonly organizationId: string;
  readonly creativeProjectId: string;
}): Promise<CreativeAssetRecord | null> {
  return getCreativeAssetStore().getPrimary({
    organizationId: input.organizationId,
    creativeProjectId: input.creativeProjectId,
  });
}

export function buildProductionResultFromStoredPrimary(
  stored: CreativeAssetRecord,
): CreativeProductionResult {
  return {
    available: true,
    generated: true,
    status: "completed",
    reason: "generated",
    providerId: stored.providerId ?? "stored",
    assets: [
      {
        providerId: stored.providerId ?? "stored",
        providerAssetId: stored.providerAssetId ?? stored.id,
        url: buildDurableCreativeAssetUrl(
          stored.creativeProjectId,
          stored.id,
        ),
        mimeType: stored.mimeType,
        width: stored.width,
        height: stored.height,
        durationMs: stored.durationMs,
      },
    ],
  };
}

export function isRegenerateExecutionJob(
  params: Readonly<Record<string, unknown>>,
): boolean {
  return params.regenerate === true;
}
