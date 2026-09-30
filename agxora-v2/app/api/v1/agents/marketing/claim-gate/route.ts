/**
 * Check a marketing draft against verified business facts.
 * The session organization is the tenant. The client cannot mark a claim as supported.
 */

import { NextResponse } from "next/server";
import { evaluatePlanForActor, publicClaimGate } from "@/app/lib/marketing/claimGateServer";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "agents.claim_gate",
      userId: actor.userId,
    });
    if (limited) return limited;
    const body = (await request.json().catch(() => null)) as {
      plan?: unknown;
      planId?: unknown;
      organizationId?: unknown;
      claimGate?: unknown;
      claimGatePassed?: unknown;
      result?: unknown;
      verified?: unknown;
      draftHash?: unknown;
      factContextHash?: unknown;
      contentHash?: unknown;
    } | null;
    void body?.organizationId;
    void body?.claimGate;
    void body?.claimGatePassed;
    void body?.result;
    void body?.verified;
    void body?.draftHash;
    void body?.factContextHash;
    void body?.contentHash;
    const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
    if (!planId) {
      return NextResponse.json({ ok: false, error: "This marketing content must be checked again." }, { status: 422 });
    }
    const checked = await evaluatePlanForActor(actor, { planId, submittedPlan: body?.plan });
    if (!checked.ok) {
      return NextResponse.json({ ok: false, error: checked.error }, { status: checked.status });
    }
    return NextResponse.json({
      ok: true,
      replayed: checked.replayed,
      executionId: checked.executionId,
      claimGate: publicClaimGate(checked.evaluation, checked.replayed),
    });
  } catch (error) {
    return jsonError(error);
  }
}
