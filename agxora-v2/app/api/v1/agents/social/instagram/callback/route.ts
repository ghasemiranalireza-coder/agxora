/**
 * GET /api/v1/agents/social/instagram/callback
 * Stores the encrypted credential. The token never appears in the redirect.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import {
  buildSafeSameOriginRedirectUrl,
} from "@/app/lib/security/safeInternalPath";
import { completeInstagramOAuthForActor } from "@/app/lib/social/instagram/oauth";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.json({ ok: false, message: "Missing OAuth callback parameters" }, { status: 400 });
    }
    const result = await completeInstagramOAuthForActor(actor, { code, state });
    const { markIntegrationConnectedForActor } = await import("@/app/lib/business-agent/integrations");
    await markIntegrationConnectedForActor(actor, "instagram", {
      accountLabel: result.username,
      externalAccountId: result.accountId,
      oauthScopes: result.scopes,
    });
    const redirectUrl = buildSafeSameOriginRedirectUrl(request.url, result.redirectPath, "/dashboard");
    redirectUrl.searchParams.set("instagram", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return jsonError(error);
  }
}
