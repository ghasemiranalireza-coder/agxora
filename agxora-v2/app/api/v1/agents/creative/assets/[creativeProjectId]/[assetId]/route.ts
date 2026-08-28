/**
 * Phase 60 — Authenticated durable creative asset GET.
 * GET /api/v1/agents/creative/assets/:creativeProjectId/:assetId
 *
 * Private customer assets — never public by obscurity.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { loadCreativeAssetForActor } from "@/app/lib/creative/assetAccess";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    creativeProjectId: string;
    assetId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const raw = await context.params;
    const creativeProjectId = decodeURIComponent(raw.creativeProjectId ?? "");
    const assetId = decodeURIComponent(raw.assetId ?? "");

    const record = await loadCreativeAssetForActor(
      actor,
      creativeProjectId,
      assetId,
    );

    const body = Buffer.from(record.bytes);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(body.byteLength),
        // Private org asset — do not cache on shared CDNs.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
