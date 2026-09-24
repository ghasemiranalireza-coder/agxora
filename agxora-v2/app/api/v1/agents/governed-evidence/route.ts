/**
 * Read governed execution evidence for the signed-in organization.
 * Rows are written by server mutation paths. Clients cannot append or edit them.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

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
