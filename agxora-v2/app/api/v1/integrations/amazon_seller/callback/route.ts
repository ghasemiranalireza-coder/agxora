/**
 * Phase 3C — GET /api/v1/integrations/amazon_seller/callback
 * Official Amazon website-authorization redirect URI.
 */

import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { completeAmazonOAuthForActor } from "@/app/lib/amazon/oauth";
import { markIntegrationConnectedForActor } from "@/app/lib/business-agent/integrations";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

function redirectWithAmazonStatus(
  requestUrl: string,
  path: string,
  status: "connected" | "denied" | "error",
): NextResponse {
  const redirectUrl = new URL(path, new URL(requestUrl).origin);
  redirectUrl.searchParams.set("amazon", status);
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const defaultPath = "/dashboard/amazon";
    const oauthError = url.searchParams.get("error");
    if (oauthError === "access_denied") {
      return redirectWithAmazonStatus(request.url, defaultPath, "denied");
    }
    if (oauthError) {
      return redirectWithAmazonStatus(request.url, defaultPath, "error");
    }

    const code = url.searchParams.get("spapi_oauth_code") ?? url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const sellingPartnerId = url.searchParams.get("selling_partner_id") ?? undefined;
    if (!code || !state) {
      return NextResponse.json(
        { ok: false, message: "Missing OAuth callback parameters" },
        { status: 400 },
      );
    }

    const result = await completeAmazonOAuthForActor(actor, {
      code,
      state,
      sellingPartnerId,
    });
    await markIntegrationConnectedForActor(actor, "amazon_seller", {
      accountLabel: result.sellingPartnerId,
      externalAccountId: result.sellingPartnerId,
    });
    return redirectWithAmazonStatus(
      request.url,
      result.redirectPath ?? defaultPath,
      "connected",
    );
  } catch (error) {
    return jsonError(error);
  }
}
