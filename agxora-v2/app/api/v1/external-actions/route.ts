import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { listExternalActionsForActor } from "@/app/lib/business-agent/audit";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const events = await listExternalActionsForActor(actor);
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      events,
    });
  } catch (error) {
    return jsonError(error);
  }
}
