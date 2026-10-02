/**
 * POST /api/v1/agents/social/instagram/connect
 * Starts Instagram Login after an explicit platform grant.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { beginInstagramOAuthForActor } from "@/app/lib/social/instagram/oauth";

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
    const body = (await request.json().catch(() => ({}))) as { redirectPath?: string };
    const { requireExplicitPlatformGrant } = await import("@/app/lib/platform-authorization/service");
    const grant = await requireExplicitPlatformGrant(actor, "instagram", body);
    const result = await beginInstagramOAuthForActor(actor, body.redirectPath, grant.oauthScopes);
    return NextResponse.json({ ok: true, authorizationUrl: result.authorizationUrl });
  } catch (error) {
    return jsonError(error);
  }
}
