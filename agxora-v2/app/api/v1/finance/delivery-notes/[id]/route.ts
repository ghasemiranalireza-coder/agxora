import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  getDeliveryNoteForActor,
  jsonError,
  updateDeliveryNoteForActor,
} from "@/app/lib/finance/persistence";
import type { DeliveryNoteDraft } from "@/app/lib/finance/core/types";

export const runtime = "nodejs";

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    const deliveryNote = await getDeliveryNoteForActor(actor, id);
    return NextResponse.json({ ok: true, deliveryNote });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    const body = (await request.json()) as { draft?: DeliveryNoteDraft };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const deliveryNote = await updateDeliveryNoteForActor(actor, id, body.draft);
    return NextResponse.json({ ok: true, deliveryNote });
  } catch (error) {
    return jsonError(error);
  }
}
