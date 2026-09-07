/**
 * Phase 71 — GET /api/v1/integrations/email_gmail/callback
 * Official Google OAuth callback. Never returns tokens.
 */

import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { markIntegrationConnectedForActor } from "@/app/lib/business-agent/integrations";
import { completeGmailOAuthForActor } from "@/app/lib/social/oauth/gmail";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

function redirectWithGmailStatus(
  requestUrl: string,
  path: string,
  status: "connected" | "denied" | "error",
): NextResponse {
  const redirectUrl = new URL(path, new URL(requestUrl).origin);
  redirectUrl.searchParams.set("gmail", status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    const defaultPath = "/dashboard/integrations";

    if (error === "access_denied") {
      return redirectWithGmailStatus(request.url, defaultPath, "denied");
    }
    if (error) {
      return redirectWithGmailStatus(request.url, defaultPath, "error");
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.json(
        { ok: false, message: "Missing OAuth callback parameters" },
        { status: 400 },
      );
    }

    const result = await completeGmailOAuthForActor(actor, { code, state });
    await markIntegrationConnectedForActor(actor, "email_gmail", {
      accountLabel: result.emailAddress ?? null,
      externalAccountId: result.emailAddress ?? null,
    });
    const redirectPath = result.redirectPath ?? defaultPath;
    return redirectWithGmailStatus(request.url, redirectPath, "connected");
  } catch (error) {
    return jsonError(error);
  }
}
