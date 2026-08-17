import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  deleteDocumentForActor,
  getDocumentForActor,
} from "@/app/lib/crm/persistence";
import { jsonError } from "@/app/lib/crm/persistence/http";

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
    const document = await getDocumentForActor(actor, id);
    return NextResponse.json({ ok: true, document });
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
    await deleteDocumentForActor(actor, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
