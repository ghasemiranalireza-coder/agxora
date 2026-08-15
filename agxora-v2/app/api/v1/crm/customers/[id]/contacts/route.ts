import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  createContactForActor,
  listContactsForActor,
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
    const { id: customerId } = await context.params;
    const items = await listContactsForActor(actor, customerId);
    return NextResponse.json({
      ok: true,
      items,
      total: items.length,
      customerId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id: customerId } = await context.params;
    const body = (await request.json()) as { draft?: CrmContactDraft };
    if (!body?.draft || typeof body.draft !== "object") {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing draft payload" },
        { status: 400 },
      );
    }
    const contact = await createContactForActor(actor, customerId, body.draft);
    return NextResponse.json({ ok: true, contact }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
