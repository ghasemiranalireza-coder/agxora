/**
 * Phase 63.1 — POST /api/v1/agents/social/youtube/disconnect
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { disconnectYouTubeForActor } from "@/app/lib/social/oauth/youtube";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "agents.social_connect",
      userId: actor.userId,
    });
    if (limited) return limited;

    await disconnectYouTubeForActor(actor);
    return NextResponse.json({ ok: true, disconnected: true });
  } catch (error) {
    return jsonError(error);
  }
}
