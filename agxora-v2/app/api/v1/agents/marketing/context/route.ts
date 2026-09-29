/**
 * Read marketing context for the signed-in organization.
 * Does not call a model and does not write.
 */

import { NextResponse } from "next/server";
import { assertMarketingWorkforceAllowed } from "@/app/lib/billing/enforce";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { buildMarketingProjection } from "@/app/lib/marketing/prepare";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => null)) as {
      statement?: string;
      offer?: string;
      organizationId?: string;
    } | null;
    void body?.organizationId;
    await assertMarketingWorkforceAllowed(actor.organizationId);
    const state = await getAgentOsStateForActor(actor);
    const built = await buildMarketingProjection({
      organizationId: actor.organizationId,
      statement: body?.statement ?? "",
      offer: body?.offer ?? "",
      state,
    });
    if (!built.ok) {
      return NextResponse.json({ ok: false, error: built.error, missingFacts: built.missingFacts ?? [] }, { status: 422 });
    }
    return NextResponse.json({
      ok: true,
      verified: true,
      organizationName: built.projection.organizationName,
      facts: built.projection.facts,
      businessFacts: built.projection.businessFacts ?? [],
      contextRecordIds: built.projection.contextRecordIds,
      missingFacts: built.missingFacts,
      narrowedFromPublish: built.projection.narrowedFromPublish,
    });
  } catch (error) {
    return jsonError(error);
  }
}
