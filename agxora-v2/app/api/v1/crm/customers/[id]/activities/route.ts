import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { listActivitiesForActor } from "@/app/lib/crm/persistence";
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
    const { id: customerId } = await context.params;
    const items = await listActivitiesForActor(actor, customerId);
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
