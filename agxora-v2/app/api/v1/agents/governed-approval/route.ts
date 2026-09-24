/**
 * Records a governed approval from the signed-in actor.
 * The request cannot set approvalGranted. Only this route appends approval.granted.
 */

import { NextResponse } from "next/server";
import { appendGovernedEvidenceDb } from "@/app/lib/agents/governedExecutionDb";
import { prisma } from "@/app/lib/db/prisma";
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
    };
    void body.approvalGranted;
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
        metadata: { idempotencyKey },
      });
    }
    return NextResponse.json({ ok: true, approval: "APPROVED" }, { status: existing ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
