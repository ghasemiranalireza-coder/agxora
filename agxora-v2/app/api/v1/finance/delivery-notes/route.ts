import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  createDeliveryNoteForActor,
  jsonError,
  listDeliveryNotesForActor,
} from "@/app/lib/finance/persistence";
import type { DeliveryNoteDraft, DeliveryNoteStatus } from "@/app/lib/finance/core/types";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const items = await listDeliveryNotesForActor(actor, {
      customerId: url.searchParams.get("customerId") ?? undefined,
      status: (url.searchParams.get("status") as DeliveryNoteStatus | "all" | null) ?? undefined,
      query: url.searchParams.get("q") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
    });
    return NextResponse.json({
      ok: true,
      items,
      total: items.length,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json()) as { draft?: DeliveryNoteDraft };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const deliveryNote = await createDeliveryNoteForActor(actor, body.draft);
    return NextResponse.json({ ok: true, deliveryNote }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
