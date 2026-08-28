/**
 * Phase 63.1 — POST /api/v1/agents/social/youtube/connect
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { beginYouTubeOAuthForActor } from "@/app/lib/social/oauth/youtube";

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

    const body = (await request.json().catch(() => ({}))) as {
      redirectPath?: string;
    };
    const result = await beginYouTubeOAuthForActor(actor, body.redirectPath);
    return NextResponse.json({ ok: true, authorizationUrl: result.authorizationUrl });
  } catch (error) {
    return jsonError(error);
  }
}
