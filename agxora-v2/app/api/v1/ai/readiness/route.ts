/**
 * GET /api/v1/ai/readiness — public-safe AI chat provider readiness.
 */

import { NextResponse } from "next/server";
import { evaluateServerAiReadiness } from "@/app/lib/ai/serverChat";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const readiness = evaluateServerAiReadiness();
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      readiness,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { ok: false, code: "unauthorized", message },
      { status: 401 },
    );
  }
}
