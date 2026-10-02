/**
 * POST /api/v1/agents/marketing/instagram/publish
 * Explicit governed publish. The client cannot choose the account, token, or caption.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { publishInstagramForActor } from "@/app/lib/marketing/instagramPublishServer";

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
    const result = await publishInstagramForActor(actor, body);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, replayed: result.replayed, instagram: result.preview });
  } catch (error) {
    return jsonError(error);
  }
}
