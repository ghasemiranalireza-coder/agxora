/**
 * Guided first marketing result.
 * The session organization is the tenant. Client organization, price, and approval fields are ignored.
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { beginFirstMarketingGoal, loadFirstResultStatus, persistFirstMarketingDraftForActor } from "@/app/lib/marketing/firstResultServer";
import { parseFirstResultStart } from "@/app/lib/marketing/firstResult";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    void url.searchParams.get("organizationId");
    void url.searchParams.get("claimGatePassed");
    void url.searchParams.get("approvalGranted");
    void url.searchParams.get("draftHash");
    void url.searchParams.get("priceId");
    const status = await loadFirstResultStatus(actor);
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const parsed = parseFirstResultStart(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
    }
    const started = await beginFirstMarketingGoal(actor, parsed.channelIntent);
    if (!started.ok) {
      return NextResponse.json(
        { ok: false, error: started.error, code: started.code, missingFacts: started.missingFacts ?? [] },
        { status: started.status },
      );
    }
    const stored = await persistFirstMarketingDraftForActor(actor);
    if (!stored.ok) {
      return NextResponse.json(
        { ok: false, error: stored.error, code: stored.code },
        { status: stored.status },
      );
    }
    return NextResponse.json({
      ok: true,
      created: started.created,
      reused: started.reused || stored.reused,
      goalId: started.goalId,
      draftReady: true,
      next: "review",
    });
  } catch (error) {
    return jsonError(error);
  }
}
