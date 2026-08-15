import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  deleteContactForActor,
  getContactForActor,
  updateContactForActor,
} from "@/app/lib/crm/persistence";
import { jsonError } from "@/app/lib/crm/persistence/http";
import type { CrmContactDraft } from "@/app/lib/crm/directory/types";

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
    const { id } = await context.params;
    const contact = await getContactForActor(actor, id);
    return NextResponse.json({ ok: true, contact });
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
    const body = (await request.json()) as { draft?: CrmContactDraft };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const contact = await updateContactForActor(actor, id, body.draft);
    return NextResponse.json({ ok: true, contact });
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
    await deleteContactForActor(actor, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
