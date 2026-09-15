import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  createInvoiceDraftForActor,
  jsonError,
  listInvoicesForActor,
} from "@/app/lib/finance/persistence";
import type { BillDeliveryNotesInput, InvoiceStatus } from "@/app/lib/finance/core/types";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const items = await listInvoicesForActor(actor, {
      customerId: url.searchParams.get("customerId") ?? undefined,
      status: (url.searchParams.get("status") as InvoiceStatus | "all" | null) ?? undefined,
      query: url.searchParams.get("q") ?? undefined,
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
    const body = (await request.json()) as BillDeliveryNotesInput;
    const invoice = await createInvoiceDraftForActor(actor, body ?? {});
    return NextResponse.json({ ok: true, invoice }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
