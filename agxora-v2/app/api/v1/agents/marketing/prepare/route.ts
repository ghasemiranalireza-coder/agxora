/**
 * Draft a seven-day marketing plan with the configured model.
 * Does not approve, store, publish, or write CRM.
 */

import { NextResponse } from "next/server";
import { assertMarketingWorkforceAllowed } from "@/app/lib/billing/enforce";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { buildMarketingProjection, draftMarketingPlan } from "@/app/lib/marketing/prepare";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => null)) as {
      statement?: string;
      offer?: string;
      channelIntent?: string;
      organizationId?: string;
      tools?: unknown;
      capabilities?: unknown;
    } | null;
    void body?.organizationId;
    void body?.tools;
    void body?.capabilities;
    await assertMarketingWorkforceAllowed(actor.organizationId);
    const state = await getAgentOsStateForActor(actor);
    const built = await buildMarketingProjection({
      organizationId: actor.organizationId,
      statement: body?.statement ?? "",
      offer: body?.offer ?? "",
      state,
      channelIntent: body?.channelIntent,
    });
    if (!built.ok) {
      return NextResponse.json({ ok: false, error: built.error }, { status: 422 });
    }
    if (built.missingFacts.length > 0) {
      return NextResponse.json(
        { ok: false, missingFacts: built.missingFacts, error: "An offer is required before a marketing plan can be prepared." },
        { status: 422 },
      );
    }
    const drafted = await draftMarketingPlan({ projection: built.projection });
    if (!drafted.ok) {
      return NextResponse.json({ ok: false, error: drafted.error }, { status: drafted.status });
    }
    return NextResponse.json({
      ok: true,
      simulated: false,
      modelId: drafted.modelId,
      plan: drafted.plan,
    });
  } catch (error) {
    return jsonError(error);
  }
}
