/**
 * Read governed execution evidence for the signed-in organization.
 * Rows are written by server mutation paths. Clients cannot append or edit them.
 * Query organizationId is ignored. Outcome is a safe projection.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { projectGovernedEvidence } from "@/app/lib/data-rights/evidenceProjection";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    void url.searchParams.get("organizationId");
    void url.searchParams.get("actorId");
    const executionId = url.searchParams.get("executionId")?.trim();
    const rows = await prisma.agentGovernedEvidence.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(executionId ? { executionId } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    const executionIds = [...new Set(rows.map((row) => row.executionId))];
    const executions = executionIds.length
      ? await prisma.agentGovernedExecution.findMany({
          where: {
            organizationId: actor.organizationId,
            executionId: { in: executionIds },
          },
          orderBy: { updatedAt: "desc" },
        })
      : [];
    const byExecution = new Map<string, (typeof executions)[number]>();
    for (const execution of executions) {
      if (!byExecution.has(execution.executionId)) byExecution.set(execution.executionId, execution);
    }
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      items: rows.map((row) => projectGovernedEvidence(row, byExecution.get(row.executionId) ?? null)),
    });
  } catch (error) {
    return jsonError(error);
  }
}
