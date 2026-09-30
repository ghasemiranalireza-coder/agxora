/**
 * Store one approved marketing plan.
 * Approval and organization come from the server. The request cannot grant approval.
 */

import { NextResponse } from "next/server";
import {
  appendGovernedEvidenceDb,
  beginGovernedMarketingRecord,
  hasServerGrantedApproval,
} from "@/app/lib/agents/governedExecutionDb";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { CLAIM_GATE_RECHECK_MESSAGE } from "@/app/lib/marketing/claimGate";
import { requirePassingClaimGate } from "@/app/lib/marketing/claimGateServer";
import { marketingPlanHash } from "@/app/lib/marketing/prepare";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { authorizeGovernedMutation } from "@/features/agents/evidence/governedAuthorization";
import { validateStoredMarketingPlan } from "@/features/agents/marketing/planSchema";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => null)) as {
      idempotencyKey?: string;
      executionId?: string;
      stepId?: string;
      plan?: unknown;
      approvalGranted?: unknown;
      organizationId?: string;
      planId?: string;
      claimGate?: unknown;
      claimGatePassed?: unknown;
      result?: unknown;
      draftHash?: unknown;
      factContextHash?: unknown;
      contentHash?: unknown;
    } | null;
    void body?.approvalGranted;
    void body?.organizationId;
    void body?.claimGate;
    void body?.claimGatePassed;
    void body?.result;
    void body?.draftHash;
    void body?.factContextHash;
    void body?.contentHash;
    const idempotencyKey = body?.idempotencyKey?.trim() ?? "";
    const executionId = body?.executionId?.trim() ?? "";
    const stepId = body?.stepId?.trim() ?? "";
    if (!idempotencyKey || !executionId || !stepId || !body?.plan) {
      return NextResponse.json({ ok: false, error: "Marketing plan fields are required." }, { status: 400 });
    }
    const validated = validateStoredMarketingPlan(body.plan);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 422 });
    }
    const planId = body.planId?.trim() ?? "";
    const claimGate = await requirePassingClaimGate(actor, planId, validated.plan);
    if (!claimGate.ok) {
      await appendGovernedEvidenceDb({
        organizationId: actor.organizationId,
        executionId,
        capabilityId: "MARKETING_RECORD_PLAN",
        actorId: actor.userId,
        action: "marketing.claim_gate",
        status: "recheck",
        metadata: { result: "recheck", planId },
      });
      return NextResponse.json({
        ok: false,
        error: claimGate.error || CLAIM_GATE_RECHECK_MESSAGE,
      }, { status: claimGate.status });
    }
    const state = await getAgentOsStateForActor(actor);
    const gate = authorizeGovernedMutation({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      capabilityId: "MARKETING_RECORD_PLAN",
      idempotencyKey,
      executionId,
      stepId,
      state,
    });
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
    }
    const approved = await hasServerGrantedApproval({
      organizationId: actor.organizationId,
      executionId: gate.context.executionId,
      stepId: gate.context.stepId,
      actorId: actor.userId,
      capabilityId: gate.context.capabilityId,
    });
    if (!approved) {
      return NextResponse.json({ ok: false, error: "This marketing plan is not approved." }, { status: 403 });
    }
    const planHash = marketingPlanHash(validated.plan);
    const claim = await beginGovernedMarketingRecord({
      organizationId: actor.organizationId,
      idempotencyKey,
      executionId: gate.context.executionId,
      businessGoalId: gate.context.businessGoalId,
      planId: gate.context.planId,
      stepId: gate.context.stepId,
      capabilityId: gate.context.capabilityId,
      workerId: gate.context.workerId,
      actorId: actor.userId,
      planHash,
      plan: validated.plan as unknown as Record<string, unknown>,
    });
    if (claim.kind === "mismatch") {
      return NextResponse.json({ ok: false, error: "This marketing execution does not match the approved plan." }, { status: 409 });
    }
    if (claim.kind === "in_progress") {
      return NextResponse.json({ ok: false, error: "This marketing plan is already being stored." }, { status: 409 });
    }
    if (claim.kind === "stored") {
      await appendGovernedEvidenceDb({
        organizationId: actor.organizationId,
        executionId: gate.context.executionId,
        businessGoalId: gate.context.businessGoalId,
        planId: gate.context.planId,
        stepId: gate.context.stepId,
        capabilityId: gate.context.capabilityId,
        workerId: gate.context.workerId,
        actorId: actor.userId,
        action: "marketing.plan.stored",
        status: "stored",
        metadata: { planRecordId: claim.planRecordId, planHash },
      });
      await appendGovernedEvidenceDb({
        organizationId: actor.organizationId,
        executionId: gate.context.executionId,
        businessGoalId: gate.context.businessGoalId,
        planId: gate.context.planId,
        stepId: gate.context.stepId,
        capabilityId: gate.context.capabilityId,
        workerId: gate.context.workerId,
        actorId: actor.userId,
        action: "marketing.claim_gate",
        status: "PASS",
        metadata: {
          contentHash: claimGate.draftHash,
          factContextHash: claimGate.factContextHash,
          checkId: claimGate.checkId,
          result: "PASS",
          supportFactIds: claimGate.supportFactIds,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      stored: true,
      replayed: claim.kind === "replay",
      planRecordId: claim.planRecordId,
      plan: claim.kind === "replay" ? claim.plan : validated.plan,
      organizationId: actor.organizationId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
