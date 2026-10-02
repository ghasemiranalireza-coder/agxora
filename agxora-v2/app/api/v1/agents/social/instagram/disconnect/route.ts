/**
 * POST /api/v1/agents/social/instagram/disconnect
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { disconnectInstagramForActor } from "@/app/lib/social/instagram/oauth";

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
    await disconnectInstagramForActor(actor);
    const { revokePlatformAuthorization } = await import("@/app/lib/platform-authorization/service");
    await revokePlatformAuthorization(actor, "instagram", "customer_disconnect");
    return NextResponse.json({ ok: true, connected: false });
  } catch (error) {
    return jsonError(error);
  }
}
