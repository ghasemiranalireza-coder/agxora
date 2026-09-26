/**
 * Organization export for the signed-in session.
 * Client organizationId, actorId, and capability fields are ignored.
 */

import { NextResponse } from "next/server";
import { loadOrganizationExport } from "@/app/lib/data-rights/loadExport";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    void new URL(request.url).searchParams.get("organizationId");
    void new URL(request.url).searchParams.get("actorId");
    const exported = await loadOrganizationExport(actor);
    if (!exported) {
      return NextResponse.json({ ok: false, code: "not_found", message: "Organization not found" }, { status: 404 });
    }
    return NextResponse.json(exported, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
