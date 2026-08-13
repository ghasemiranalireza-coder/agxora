import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy/actor";
import { revokeManagedSession } from "@/app/lib/auth/server/managedSessions";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

type Ctx = {
  readonly params: Promise<{ readonly id: string }>;
};

/**
 * POST /api/v1/auth/sessions/[id]/revoke
 * Revokes one of the caller's sessions. Cross-user ids return 404.
 * The current session cannot be revoked here — use POST /api/v1/auth/logout.
 */
export async function POST(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { id } = await context.params;
    const actor = await requireCurrentActor();
    const result = await revokeManagedSession(actor, id);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return authJsonError(error);
  }
}
