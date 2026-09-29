/**
 * Regenerate is a new explicit action, a new execution, and a new provider call.
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { generateMarketingImageForActor } from "@/app/lib/marketing/imageServer";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "agents.creative_generate",
      userId: actor.userId,
    });
    if (limited) return limited;
    const body = (await request.json().catch(() => null)) as Parameters<typeof generateMarketingImageForActor>[1];
    const result = await generateMarketingImageForActor(actor, body, "regenerate");
    if (!result.ok) {
      const ambiguous = "ambiguous" in result && result.ambiguous === true;
      return NextResponse.json(
        { ok: false, error: result.error, ambiguous },
        { status: result.status },
      );
    }
    return NextResponse.json({ ok: true, replayed: result.replayed, result: result.result });
  } catch (error) {
    return jsonError(error);
  }
}
