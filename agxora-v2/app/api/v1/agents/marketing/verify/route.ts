/**
 * Read back a stored marketing plan for the signed-in organization.
 * Verification proves the stored document matches. It does not prove performance.
 */

import { NextResponse } from "next/server";
import { appendGovernedEvidenceDb } from "@/app/lib/agents/governedExecutionDb";
import { prisma } from "@/app/lib/db/prisma";
import { marketingPlanHash } from "@/app/lib/marketing/prepare";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { validateStoredMarketingPlan } from "@/features/agents/marketing/planSchema";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => null)) as {
      planRecordId?: string;
      executionId?: string;
      stepId?: string;
      organizationId?: string;
    } | null;
    void body?.organizationId;
    const planRecordId = body?.planRecordId?.trim() ?? "";
    const executionId = body?.executionId?.trim() ?? "";
    const stepId = body?.stepId?.trim() ?? "";
    if (!planRecordId || !executionId || !stepId) {
      return NextResponse.json({ ok: false, error: "Marketing verification fields are required." }, { status: 400 });
    }
    const row = await prisma.agentGovernedExecution.findFirst({
      where: {
        id: planRecordId,
        organizationId: actor.organizationId,
        capabilityId: "MARKETING_RECORD_PLAN",
        status: "COMPLETED",
      },
    });
    if (!row || row.organizationId !== actor.organizationId || row.executionId !== executionId) {
      return NextResponse.json({ ok: false, verified: false, error: "Marketing plan was not found." }, { status: 404 });
    }
    const outcome = row.outcome && typeof row.outcome === "object" && !Array.isArray(row.outcome)
      ? (row.outcome as Record<string, unknown>)
      : {};
    const validated = validateStoredMarketingPlan(outcome.plan);
    if (!validated.ok || outcome.planHash !== marketingPlanHash(validated.plan)) {
      return NextResponse.json({ ok: false, verified: false, error: "Marketing plan readback did not match." }, { status: 409 });
    }
    const storedEvidence = await prisma.agentGovernedEvidence.findFirst({
      where: {
        organizationId: actor.organizationId,
        executionId: row.executionId,
        action: "marketing.plan.stored",
        status: "stored",
      },
    });
    if (!storedEvidence) {
      return NextResponse.json({ ok: false, verified: false, error: "Marketing plan evidence is missing." }, { status: 409 });
    }
    const existing = await prisma.agentGovernedEvidence.findFirst({
      where: {
        organizationId: actor.organizationId,
        executionId: row.executionId,
        stepId,
        action: "marketing.plan.readback",
        status: "verified",
      },
    });
    if (!existing) {
      await appendGovernedEvidenceDb({
        organizationId: actor.organizationId,
        executionId: row.executionId,
        businessGoalId: row.businessGoalId ?? undefined,
        planId: row.planId ?? undefined,
        stepId,
        capabilityId: "MARKETING_VERIFY_PLAN",
        workerId: row.workerId ?? undefined,
        actorId: actor.userId,
        action: "marketing.plan.readback",
        status: "verified",
        metadata: { planRecordId: row.id },
      });
    }
    const evidence = existing ?? await prisma.agentGovernedEvidence.findFirst({
      where: {
        organizationId: actor.organizationId,
        executionId: row.executionId,
        action: "marketing.plan.readback",
        status: "verified",
      },
    });
    await prisma.agentGovernedExecution.update({
      where: { id: row.id },
      data: { verificationStatus: "verified" },
    });
    return NextResponse.json({
      ok: true,
      verified: true,
      planRecordId: row.id,
      evidenceId: evidence?.id,
      organizationId: actor.organizationId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
