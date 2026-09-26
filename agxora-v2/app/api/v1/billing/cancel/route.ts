/**
 * Cancel the signed-in organization's subscription at period end.
 * A second request is idempotent. There is no refund.
 */

import { NextResponse } from "next/server";
import { cancelSubscription } from "@/app/lib/billing/service";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const result = await cancelSubscription(actor);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
