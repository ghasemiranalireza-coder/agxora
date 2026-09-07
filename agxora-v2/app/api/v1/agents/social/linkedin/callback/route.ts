/**
 * Phase 3B — GET /api/v1/agents/social/linkedin/callback
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { completeLinkedInOAuthForActor } from "@/app/lib/social/oauth/linkedin";
import { markIntegrationConnectedForActor } from "@/app/lib/business-agent/integrations";

export const runtime = "nodejs";

function redirectWithLinkedInStatus(
  requestUrl: string,
  path: string,
  status: "connected" | "denied" | "error",
): NextResponse {
  const redirectUrl = new URL(path, new URL(requestUrl).origin);
  redirectUrl.searchParams.set("linkedin", status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const defaultPath = "/dashboard/integrations";
    const oauthError = url.searchParams.get("error");
    if (
      oauthError === "user_cancelled_login" ||
      oauthError === "user_cancelled_authorize" ||
      oauthError === "access_denied"
    ) {
      return redirectWithLinkedInStatus(request.url, defaultPath, "denied");
    }
    if (oauthError) {
      return redirectWithLinkedInStatus(request.url, defaultPath, "error");
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.json(
        { ok: false, message: "Missing OAuth callback parameters" },
        { status: 400 },
      );
    }

    const result = await completeLinkedInOAuthForActor(actor, { code, state });
    await markIntegrationConnectedForActor(actor, "linkedin", {
      accountLabel: result.displayName ?? null,
      externalAccountId: result.memberId,
    });
    const redirectPath = result.redirectPath ?? defaultPath;
    return redirectWithLinkedInStatus(request.url, redirectPath, "connected");
  } catch (error) {
    return jsonError(error);
  }
}
