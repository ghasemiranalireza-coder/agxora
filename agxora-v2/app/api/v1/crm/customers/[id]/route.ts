import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  deleteCustomerForActor,
  getCustomerForActor,
  updateCustomerForActor,
} from "@/app/lib/crm/persistence";
import { jsonError } from "@/app/lib/crm/persistence/http";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory/types";

export const runtime = "nodejs";

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    const customer = await getCustomerForActor(actor, id);
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    const body = (await request.json()) as { draft?: CrmCustomerDraft };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const customer = await updateCustomerForActor(actor, id, body.draft);
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    await deleteCustomerForActor(actor, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
