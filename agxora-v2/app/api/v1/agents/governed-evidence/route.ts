/**
 * Append-only governed execution evidence.
 * Organization comes from the session. Historical rows are not updated.
 */

import { NextResponse } from "next/server";
import { appendGovernedEvidenceDb } from "@/app/lib/agents/governedExecutionDb";
import { prisma } from "@/app/lib/db/prisma";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

const ACTIONS = new Set([
  "goal.created",
  "plan.created",
  "step.prepared",
  "approval.requested",
  "approval.granted",
  "execution.started",
  "execution.result",
  "verification.result",
  "goal.completed",
]);

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const executionId = new URL(request.url).searchParams.get("executionId")?.trim();
    const rows = await prisma.agentGovernedEvidence.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(executionId ? { executionId } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      items: rows.map((row) => ({
        id: row.id,
        executionId: row.executionId,
        businessGoalId: row.businessGoalId,
        planId: row.planId,
        stepId: row.stepId,
        capabilityId: row.capabilityId,
        workerId: row.workerId,
        actorId: row.actorId,
        action: row.action,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json()) as {
      executionId?: string;
      businessGoalId?: string;
      planId?: string;
      stepId?: string;
      capabilityId?: string;
      workerId?: string;
      action?: string;
      status?: string;
    };
    const action = body.action?.trim() ?? "";
    const executionId = body.executionId?.trim() ?? "";
    const status = body.status?.trim() ?? "";
    if (!ACTIONS.has(action) || !executionId || !status) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Evidence action is not recognized." },
        { status: 400 },
      );
    }
    await appendGovernedEvidenceDb({
      organizationId: actor.organizationId,
      executionId,
      businessGoalId: body.businessGoalId?.trim() || undefined,
      planId: body.planId?.trim() || undefined,
      stepId: body.stepId?.trim() || undefined,
      capabilityId: body.capabilityId?.trim() || undefined,
      workerId: body.workerId?.trim() || undefined,
      actorId: actor.userId,
      action,
      status,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
