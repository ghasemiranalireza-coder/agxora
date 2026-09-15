import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError, previewBillingForActor } from "@/app/lib/finance/persistence";
import type { BillDeliveryNotesInput } from "@/app/lib/finance/core/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = ((await request.json()) ?? {}) as BillDeliveryNotesInput;
    const preview = await previewBillingForActor(actor, body);
    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    return jsonError(error);
  }
}
