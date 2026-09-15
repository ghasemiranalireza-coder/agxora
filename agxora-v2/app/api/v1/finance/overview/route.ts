import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { getFinanceOverviewForActor, jsonError } from "@/app/lib/finance/persistence";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const overview = await getFinanceOverviewForActor(actor);
    return NextResponse.json({
      ok: true,
      overview,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
