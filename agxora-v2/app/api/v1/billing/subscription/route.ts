/**
 * Safe commercial subscription projection for the signed-in organization.
 */

import { NextResponse } from "next/server";
import { getBillingView } from "@/app/lib/billing/service";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    url.searchParams.delete("organizationId");
    const view = await getBillingView(actor);
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
