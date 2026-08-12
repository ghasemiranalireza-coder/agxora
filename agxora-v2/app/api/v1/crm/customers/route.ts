import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  createCustomerForActor,
  listCustomersForActor,
} from "@/app/lib/crm/persistence";
import { jsonError } from "@/app/lib/crm/persistence/http";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory/types";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const items = await listCustomersForActor(actor);
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
    const body = (await request.json()) as { draft?: CrmCustomerDraft };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const customer = await createCustomerForActor(actor, body.draft);
    return NextResponse.json({ ok: true, customer }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
