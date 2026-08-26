import { NextResponse } from "next/server";
import { getSessionPublic } from "@/app/lib/auth/server";
import { readSessionToken } from "@/app/lib/tenancy/actor";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const token = await readSessionToken();
    const current = await getSessionPublic(token);
    if (!current) {
      return NextResponse.json({
        ok: true,
        user: null,
        session: null,
        organizationId: null,
        workspaceId: null,
      });
    }
    return NextResponse.json({
      ok: true,
      user: current.user,
      session: current.session,
      // Phase 57 — membership-derived org authority (never client-supplied).
      organizationId: current.organizationId,
      workspaceId: current.workspaceId,
    });
  } catch (error) {
    return authJsonError(error);
  }
}
