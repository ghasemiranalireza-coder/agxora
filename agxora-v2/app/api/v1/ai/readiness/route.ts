import { NextResponse } from "next/server";
import { getAiServerConfig } from "@/app/lib/ai/serverConfig";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/ai/readiness
 * Authenticated AI provider status. Never includes secrets.
 * Mirrors GET /api/v1/agents/creative/status (feature status, not /api/health).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const config = getAiServerConfig();
    return NextResponse.json(
      {
        ...config,
        organizationId: actor.organizationId,
      },
      {
        status: config.ready ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}
