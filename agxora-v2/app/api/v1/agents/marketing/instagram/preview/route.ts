/**
 * POST /api/v1/agents/marketing/instagram/preview
 * Shows the approved caption and connection. Does not publish or reserve an execution.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { previewInstagramPublishForActor } from "@/app/lib/marketing/instagramPublishServer";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "agents.instagram_publish",
      userId: actor.userId,
    });
    if (limited) return limited;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await previewInstagramPublishForActor(actor, body);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, instagram: result.preview });
  } catch (error) {
    return jsonError(error);
  }
}
