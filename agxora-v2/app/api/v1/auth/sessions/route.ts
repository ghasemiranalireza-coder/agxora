import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy/actor";
import { listManagedSessions } from "@/app/lib/auth/server/managedSessions";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

/**
 * GET /api/v1/auth/sessions
 * Lists the authenticated user's active server sessions.
 * Current session is identified from the httpOnly cookie, never from the client.
 */
export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const result = await listManagedSessions(actor);
    return NextResponse.json({ ok: true, sessions: result.sessions });
  } catch (error) {
    return authJsonError(error);
  }
}
