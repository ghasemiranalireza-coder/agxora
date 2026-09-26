/**
 * Start Stripe Checkout for the signed-in organization.
 * The request body cannot choose the organization or prove payment.
 */

import { NextResponse } from "next/server";
import { startCheckout } from "@/app/lib/billing/service";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => ({}))) as {
      planCode?: unknown;
      billingInterval?: unknown;
      organizationId?: unknown;
      successUrl?: unknown;
    };
    const result = await startCheckout(actor, body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
