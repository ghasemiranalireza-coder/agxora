import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { deleteDeliveryNoteItemForActor, jsonError } from "@/app/lib/finance/persistence";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string; readonly itemId: string }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id, itemId } = await context.params;
    const deliveryNote = await deleteDeliveryNoteItemForActor(actor, id, itemId);
    return NextResponse.json({ ok: true, deliveryNote });
  } catch (error) {
    return jsonError(error);
  }
}
