/**
 * Phase 3C — GET /api/v1/integrations/amazon_seller/login
 * Official Amazon website-authorization login URI.
 */

import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { continueAmazonOAuthLoginForActor } from "@/app/lib/amazon/oauth";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const amazonCallbackUri = url.searchParams.get("amazon_callback_uri") ?? "";
    const amazonState = url.searchParams.get("amazon_state") ?? "";
    const sellingPartnerId = url.searchParams.get("selling_partner_id") ?? "";
    const version = url.searchParams.get("version");
    const result = await continueAmazonOAuthLoginForActor(actor, {
      amazonCallbackUri,
      amazonState,
      sellingPartnerId,
      version,
    });
    const response = NextResponse.redirect(result.amazonRedirectUrl);
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
