/**
 * Phase 63.1 — GET /api/v1/agents/social/youtube/callback
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import {
  buildSafeSameOriginRedirectUrl,
  YOUTUBE_OAUTH_FALLBACK_PATH,
} from "@/app/lib/security/safeInternalPath";
import { completeYouTubeOAuthForActor } from "@/app/lib/social/oauth/youtube";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.json(
        { ok: false, message: "Missing OAuth callback parameters" },
        { status: 400 },
      );
    }

    const result = await completeYouTubeOAuthForActor(actor, { code, state });
    const redirectUrl = buildSafeSameOriginRedirectUrl(
      request.url,
      result.redirectPath,
      YOUTUBE_OAUTH_FALLBACK_PATH,
    );
    redirectUrl.searchParams.set("youtube", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return jsonError(error);
  }
}
