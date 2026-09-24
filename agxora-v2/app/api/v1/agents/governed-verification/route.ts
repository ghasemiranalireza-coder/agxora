/**
 * Server-side verification of a completed governed execution.
 * The client cannot set the verification result.
 */

import { NextResponse } from "next/server";
import { appendGovernedEvidenceDb } from "@/app/lib/agents/governedExecutionDb";
import { prisma } from "@/app/lib/db/prisma";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json()) as { idempotencyKey?: string; customerId?: string };
    const idempotencyKey = body.idempotencyKey?.trim() ?? "";
    const customerId = body.customerId?.trim() ?? "";
    if (!idempotencyKey || !customerId) {
      return NextResponse.json({ ok: false, code: "validation", message: "Verification target is required." }, { status: 422 });
    }
    const execution = await prisma.agentGovernedExecution.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: actor.organizationId,
          idempotencyKey,
        },
      },
    });
    const outcome = execution?.outcome;
    const record = outcome && typeof outcome === "object" && !Array.isArray(outcome)
      ? (outcome as Record<string, unknown>)
      : {};
    const sameCustomer = record.customerId === customerId;
    const emailVerified = execution?.capabilityId === "COMMUNICATION_SEND_EMAIL" && record.delivery === "queued" && sameCustomer;
    const noteVerified = execution?.capabilityId === "CRM_CREATE_NOTE" && typeof record.noteId === "string" && sameCustomer;
    if (!execution || execution.status !== "COMPLETED" || (!emailVerified && !noteVerified)) {
      return NextResponse.json(
        { ok: false, code: "conflict", message: "This execution cannot be verified." },
        { status: 409 },
      );
    }
    if (execution.verificationStatus !== "verified") {
      await prisma.agentGovernedExecution.update({
        where: { id: execution.id },
        data: { verificationStatus: "verified" },
      });
      await appendGovernedEvidenceDb({
        organizationId: actor.organizationId,
        executionId: execution.executionId,
        businessGoalId: execution.businessGoalId ?? undefined,
        planId: execution.planId ?? undefined,
        stepId: execution.stepId ?? undefined,
        capabilityId: execution.capabilityId,
        workerId: execution.workerId ?? undefined,
        actorId: actor.userId,
        action: "verification.result",
        status: "verified",
        metadata: {
          idempotencyKey,
          customerId,
          ...(emailVerified ? { delivery: "queued" } : { noteId: String(record.noteId) }),
        },
      });
    }
    return NextResponse.json({
      ok: true,
      verified: true,
      verificationStatus: "verified",
      executionId: execution.executionId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
