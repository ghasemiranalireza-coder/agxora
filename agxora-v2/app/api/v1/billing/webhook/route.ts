/**
 * Stripe webhook. Invalid signatures are rejected. The raw body is verified
 * before it is parsed. Processing is idempotent on provider event id.
 */

import { NextResponse } from "next/server";
import { processStripeWebhook } from "@/app/lib/billing/service";
import { jsonError } from "@/app/lib/crm/persistence/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const result = await processStripeWebhook(rawBody, signature);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
