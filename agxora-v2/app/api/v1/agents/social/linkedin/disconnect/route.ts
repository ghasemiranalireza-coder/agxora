/**
 * Phase 3B — POST /api/v1/agents/social/linkedin/disconnect
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { disconnectLinkedInForActor } from "@/app/lib/social/oauth/linkedin";

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

    await disconnectLinkedInForActor(actor);
    return NextResponse.json({ ok: true, disconnected: true });
  } catch (error) {
    return jsonError(error);
  }
}
