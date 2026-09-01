import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { listCalendarForActor } from "@/app/lib/business-agent/campaigns";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const items = await listCalendarForActor(actor);
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      items,
    });
  } catch (error) {
    return jsonError(error);
  }
}
