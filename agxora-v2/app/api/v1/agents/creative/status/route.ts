/**
 * Phase 59 — Creative image generation status (no secrets).
 * GET /api/v1/agents/creative/status
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { getServerCreativeImageStatus } from "@/app/lib/creative/serverProvider";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const status = getServerCreativeImageStatus();
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      provider: {
        id: status.id,
        configured: status.configured,
        modalities: status.modalities,
        setting: status.providerSetting,
        // Phase 59 supports real IMAGE_AD generation only.
        supportsImageAd: status.configured && status.modalities.includes("image"),
        supportsVideo: false,
        supportsAnimation: false,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
