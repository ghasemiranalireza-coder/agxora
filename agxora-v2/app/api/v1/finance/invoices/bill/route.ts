import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { billDeliveryNotesForActor, jsonError } from "@/app/lib/finance/persistence";
import type { BillDeliveryNotesInput } from "@/app/lib/finance/core/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const headerKey = request.headers.get("idempotency-key")?.trim();
    const body = ((await request.json()) ?? {}) as BillDeliveryNotesInput;
    const billed = await billDeliveryNotesForActor(actor, {
      ...body,
      idempotencyKey: body.idempotencyKey ?? headerKey ?? undefined,
    });
    return NextResponse.json(
      {
        ok: true,
        invoice: billed.invoice,
        idempotentReplay: billed.idempotentReplay,
      },
      { status: billed.idempotentReplay ? 200 : 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
