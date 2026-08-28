/**
 * Phase 59 / 62 — Creative media generation status (no secrets).
 * GET /api/v1/agents/creative/status
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { getServerCreativeMediaStatus } from "@/app/lib/creative/serverProvider";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const status = getServerCreativeMediaStatus();
    const imageConfigured =
      status.image.configured && status.image.modalities.includes("image");
    const videoConfigured =
      status.video.configured && status.video.modalities.includes("video");
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      provider: {
        id: imageConfigured
          ? status.image.id
          : videoConfigured
            ? status.video.id
            : status.image.id,
        configured: imageConfigured || videoConfigured,
        modalities: [
          ...(imageConfigured ? (["image"] as const) : []),
          ...(videoConfigured ? (["video"] as const) : []),
        ],
        setting: status.image.providerSetting,
        supportsImageAd: imageConfigured,
        supportsVideoAd: videoConfigured,
        supportsSocialVideo: videoConfigured,
        supportsAnimation: false,
      },
      imageProvider: {
        id: status.image.id,
        configured: imageConfigured,
        setting: status.image.providerSetting,
      },
      videoProvider: {
        id: status.video.id,
        configured: videoConfigured,
        setting: status.video.providerSetting,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
