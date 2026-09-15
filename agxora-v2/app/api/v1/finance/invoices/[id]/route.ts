import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  getInvoiceForActor,
  jsonError,
  updateInvoiceStatusForActor,
} from "@/app/lib/finance/persistence";

export const runtime = "nodejs";

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    const invoice = await getInvoiceForActor(actor, id);
    return NextResponse.json({ ok: true, invoice });
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
    const body = (await request.json()) as { status?: string };
    if (!body?.status) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing status" },
        { status: 400 },
      );
    }
    const invoice = await updateInvoiceStatusForActor(actor, id, body.status);
    return NextResponse.json({ ok: true, invoice });
  } catch (error) {
    return jsonError(error);
  }
}
