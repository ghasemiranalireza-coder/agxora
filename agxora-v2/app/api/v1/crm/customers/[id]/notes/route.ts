import { NextResponse } from "next/server";
import {
  claimGovernedExecutionDb,
  completeGovernedExecutionDb,
  failGovernedExecutionDb,
} from "@/app/lib/agents/governedExecutionDb";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  createNoteForActor,
  listNotesForActor,
} from "@/app/lib/crm/persistence";
import { jsonError } from "@/app/lib/crm/persistence/http";
import type { CrmNoteDraft } from "@/app/lib/crm/directory/types";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id: customerId } = await context.params;
    const items = await listNotesForActor(actor, customerId);
    return NextResponse.json({
      ok: true,
      items,
      total: items.length,
      customerId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id: customerId } = await context.params;
    const body = (await request.json()) as {
      draft?: CrmNoteDraft;
      idempotencyKey?: string;
      executionId?: string;
      businessGoalId?: string;
      planId?: string;
      stepId?: string;
      workerId?: string;
    };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const idempotencyKey = body.idempotencyKey?.trim() ?? "";
    if (idempotencyKey) {
      const claim = await claimGovernedExecutionDb({
        organizationId: actor.organizationId,
        idempotencyKey,
        executionId: body.executionId?.trim() || idempotencyKey,
        businessGoalId: body.businessGoalId?.trim() || undefined,
        planId: body.planId?.trim() || undefined,
        stepId: body.stepId?.trim() || undefined,
        capabilityId: "CRM_CREATE_NOTE",
        workerId: body.workerId?.trim() || undefined,
        actorId: actor.userId,
        approvalRequired: true,
        approvalGranted: true,
      });
      if (claim.kind === "replay") {
        const noteId = typeof claim.outcome.noteId === "string" ? claim.outcome.noteId : "";
        const replayCustomerId =
          typeof claim.outcome.customerId === "string" ? claim.outcome.customerId : customerId;
        if (!noteId) {
          return NextResponse.json(
            { ok: false, code: "conflict", message: "This CRM note execution has no stored note." },
            { status: 409 },
          );
        }
        return NextResponse.json({
          ok: true,
          note: { id: noteId, customerId: replayCustomerId },
          replayed: true,
        });
      }
      if (claim.kind === "in_progress") {
        return NextResponse.json(
          { ok: false, code: "conflict", message: "This CRM note execution is already in progress." },
          { status: 409 },
        );
      }
    }
    let note: Awaited<ReturnType<typeof createNoteForActor>>;
    try {
      note = await createNoteForActor(actor, customerId, body.draft);
    } catch (createError) {
      if (idempotencyKey) {
        await failGovernedExecutionDb({
          organizationId: actor.organizationId,
          idempotencyKey,
          mutated: false,
        });
      }
      throw createError;
    }
    if (idempotencyKey) {
      await completeGovernedExecutionDb({
        organizationId: actor.organizationId,
        idempotencyKey,
        verificationStatus: "pending",
        outcome: { noteId: note.id, customerId: note.customerId },
      });
    }
    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
