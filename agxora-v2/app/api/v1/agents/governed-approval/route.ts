/**
 * Records a governed approval from the signed-in actor.
 * The request cannot set approvalGranted. Only this route appends approval.granted.
 */

import { NextResponse } from "next/server";
import { appendGovernedEvidenceDb } from "@/app/lib/agents/governedExecutionDb";
import { prisma } from "@/app/lib/db/prisma";
import { CLAIM_GATE_RECHECK_MESSAGE } from "@/app/lib/marketing/claimGate";
import { requirePassingClaimGate } from "@/app/lib/marketing/claimGateServer";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { authorizeCapabilityExecution } from "@/features/agents/capabilities/registry";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json()) as {
      executionId?: string;
      stepId?: string;
      capabilityId?: string;
      idempotencyKey?: string;
      businessGoalId?: string;
      planId?: string;
      workerId?: string;
      approvalGranted?: unknown;
      claimGatePassed?: unknown;
      claimGate?: unknown;
      result?: unknown;
      draftHash?: unknown;
      factContextHash?: unknown;
      contentHash?: unknown;
      organizationId?: unknown;
    };
    void body.approvalGranted;
    void body.claimGatePassed;
    void body.claimGate;
    void body.result;
    void body.draftHash;
    void body.factContextHash;
    void body.contentHash;
    void body.organizationId;
    const executionId = body.executionId?.trim() ?? "";
    const stepId = body.stepId?.trim() ?? "";
    const capabilityId = body.capabilityId?.trim() ?? "";
    const idempotencyKey = body.idempotencyKey?.trim() ?? "";
    if (!executionId || !stepId || !capabilityId || !idempotencyKey) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Approval target is required." },
        { status: 422 },
      );
    }
    const decision = authorizeCapabilityExecution({
      capabilityId,
      organizationId: actor.organizationId,
    });
    if (!decision.ok) {
      return NextResponse.json(
        { ok: false, code: "forbidden", message: decision.failure.reason },
        { status: 403 },
      );
    }
    let claimBinding: { draftHash: string; factContextHash: string; checkId: string } | null = null;
    if (capabilityId === "MARKETING_RECORD_PLAN") {
      const planId = body.planId?.trim() ?? "";
      const claimGate = await requirePassingClaimGate(actor, planId);
      if (!claimGate.ok) {
        return NextResponse.json(
          { ok: false, code: "recheck", message: claimGate.error || CLAIM_GATE_RECHECK_MESSAGE },
          { status: 422 },
        );
      }
      claimBinding = claimGate;
    }
    const existing = await prisma.agentGovernedEvidence.findFirst({
      where: {
        organizationId: actor.organizationId,
        executionId,
        stepId,
        action: "approval.granted",
        actorId: actor.userId,
      },
    });
    if (!existing) {
      await appendGovernedEvidenceDb({
        organizationId: actor.organizationId,
        executionId,
        businessGoalId: body.businessGoalId?.trim() || undefined,
        planId: body.planId?.trim() || undefined,
        stepId,
        capabilityId,
        workerId: body.workerId?.trim() || undefined,
        actorId: actor.userId,
        action: "approval.granted",
        status: "APPROVED",
        metadata: {
          idempotencyKey,
          ...(claimBinding
            ? {
              draftHash: claimBinding.draftHash,
              factContextHash: claimBinding.factContextHash,
              checkId: claimBinding.checkId,
            }
            : {}),
        },
      });
    }
    return NextResponse.json({ ok: true, approval: "APPROVED" }, { status: existing ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
