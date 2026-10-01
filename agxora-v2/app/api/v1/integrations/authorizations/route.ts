import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { listPlatformAuthorizations } from "@/app/lib/platform-authorization/service";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const authorizations = await listPlatformAuthorizations(actor);
    return NextResponse.json({ ok: true, authorizations });
  } catch (error) {
    return jsonError(error);
  }
}
