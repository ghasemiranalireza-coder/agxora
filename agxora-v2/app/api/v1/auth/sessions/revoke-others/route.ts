import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy/actor";
import { revokeOtherManagedSessions } from "@/app/lib/auth/server/managedSessions";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

/**
 * POST /api/v1/auth/sessions/revoke-others
 * Revokes every active session for the caller except the current cookie session.
 */
export async function POST(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const result = await revokeOtherManagedSessions(actor);
    return NextResponse.json({
      ok: true,
      revokedCount: result.revokedCount,
    });
  } catch (error) {
    return authJsonError(error);
  }
}
