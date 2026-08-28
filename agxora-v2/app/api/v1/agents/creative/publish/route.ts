/**
 * Phase 63.0 — Server creative publish boundary.
 * POST /api/v1/agents/creative/publish
 *
 * Secrets and media bytes stay server-side. Actor organization is authoritative.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import {
  publishCreativeForActor,
  type ServerCreativePublishInput,
} from "@/app/lib/creative/publish";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();

    const limited = await rateLimitResponse({
      request,
      policyId: "agents.creative_publish",
      userId: actor.userId,
    });
    if (limited) return limited;

    const body = (await request.json()) as ServerCreativePublishInput;
    const result = await publishCreativeForActor(actor, body);

    return NextResponse.json({
      ok: true,
      organizationId: result.organizationId,
      creativeProjectId: result.creativeProjectId,
      approvalId: result.approvalId,
      publishExecutionJobId: result.publishExecutionJobId,
      publishResult: result.publishResult,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (error) {
    return jsonError(error);
  }
}
