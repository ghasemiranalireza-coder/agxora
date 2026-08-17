import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { getActivityForActor } from "@/app/lib/crm/persistence";
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
    const activity = await getActivityForActor(actor, id);
    return NextResponse.json({ ok: true, activity });
  } catch (error) {
    return jsonError(error);
  }
}
