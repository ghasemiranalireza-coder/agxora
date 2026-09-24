import { NextResponse } from "next/server";
import { commitGovernedCrmNote, hasServerGrantedApproval } from "@/app/lib/agents/governedExecutionDb";
import { getCustomerForActor } from "@/app/lib/crm/persistence";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { validateNoteDraft } from "@/app/lib/crm/directory/validation";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { assertCan } from "@/app/lib/tenancy/authorize";
import { authorizeGovernedMutation } from "@/features/agents/evidence/governedAuthorization";
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
      stepId?: string;
      approvalGranted?: unknown;
    };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const idempotencyKey = body.idempotencyKey?.trim() ?? "";
    const executionId = body.executionId?.trim() ?? "";
    const stepId = body.stepId?.trim() ?? "";
    const governed = Boolean(idempotencyKey || executionId || stepId || body.approvalGranted != null);
    if (!governed) {
      const note = await createNoteForActor(actor, customerId, body.draft);
      return NextResponse.json({ ok: true, note }, { status: 201 });
    }
    if (!idempotencyKey || !executionId || !stepId) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "A governed CRM note requires an idempotency key, execution, and step." },
        { status: 422 },
      );
    }
    const state = await getAgentOsStateForActor(actor);
    const gate = authorizeGovernedMutation({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      capabilityId: "CRM_CREATE_NOTE",
      idempotencyKey,
      executionId,
      stepId,
      state,
    });
    if (!gate.ok) {
      return NextResponse.json({ ok: false, code: "forbidden", message: gate.message }, { status: gate.status });
    }
    const approved = await hasServerGrantedApproval({
      organizationId: actor.organizationId,
      executionId: gate.context.executionId,
      stepId: gate.context.stepId,
      actorId: actor.userId,
      capabilityId: gate.context.capabilityId,
    });
    if (!approved) {
      return NextResponse.json(
        { ok: false, code: "forbidden", message: "This governed step is not approved." },
        { status: 403 },
      );
    }
    const customer = await getCustomerForActor(actor, customerId);
    if (customer.organizationId !== actor.organizationId || customer.id !== customerId) {
      return NextResponse.json({ ok: false, code: "not_found", message: "Customer not found" }, { status: 404 });
    }
    assertCan(actor, "customer.create", {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    });
    const draft = validateNoteDraft(body.draft);
    if (!draft.ok) {
      return NextResponse.json({ ok: false, code: "validation", message: "Note validation failed" }, { status: 400 });
    }
    const committed = await commitGovernedCrmNote({
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      customerId,
      idempotencyKey,
      executionId: gate.context.executionId,
      businessGoalId: gate.context.businessGoalId,
      planId: gate.context.planId,
      stepId: gate.context.stepId,
      capabilityId: gate.context.capabilityId,
      workerId: gate.context.workerId,
      actorId: actor.userId,
      title: draft.value.title,
      body: draft.value.body,
      author: draft.value.author,
    });
    if (committed.kind === "mismatch") {
      return NextResponse.json(
        { ok: false, code: "conflict", message: "This CRM note execution does not match the customer." },
        { status: 409 },
      );
    }
    if (committed.kind === "in_progress") {
      return NextResponse.json(
        { ok: false, code: "conflict", message: "This CRM note execution is already in progress." },
        { status: 409 },
      );
    }
    if (committed.kind !== "created" && committed.kind !== "replay") {
      return NextResponse.json(
        { ok: false, code: "conflict", message: "This CRM note execution is already in progress." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      replayed: committed.kind === "replay",
      note: {
        id: committed.noteId,
        customerId: committed.customerId,
        title: draft.value.title,
        body: draft.value.body,
        author: draft.value.author,
      },
    }, { status: committed.kind === "replay" ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
