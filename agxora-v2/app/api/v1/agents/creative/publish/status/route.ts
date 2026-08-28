/**
 * Phase 65.0 — actor-scoped creative publish status.
 * GET /api/v1/agents/creative/publish/status
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { getCreativePublishStatusForActor } from "@/app/lib/creative/publishStatus";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "agents.creative_publish_status",
      userId: actor.userId,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const creativeProjectId = url.searchParams.get("creativeProjectId") ?? "";
    const publishExecutionJobId = url.searchParams.get("publishExecutionJobId") ?? "";
    const result = await getCreativePublishStatusForActor(actor, {
      creativeProjectId,
      publishExecutionJobId,
    });

    return NextResponse.json({
      ok: true,
      organizationId: result.organizationId,
      creativeProjectId: result.creativeProjectId,
      publishExecutionJobId: result.publishExecutionJobId,
      publishResult: result.publishResult,
      uploadSession: result.uploadSession,
    });
  } catch (error) {
    return jsonError(error);
  }
}
