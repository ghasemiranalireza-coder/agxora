/**
 * Phase 59.1 — Server creative image generation boundary.
 * POST /api/v1/agents/creative/generate
 *
 * Secrets stay server-side. Actor organization is authoritative.
 * Client approvalState is never authoritative.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import {
  generateCreativeImageForActor,
  type ServerCreativeGenerateInput,
} from "@/app/lib/creative/generate";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();

    const limited = await rateLimitResponse({
      request,
      policyId: "agents.creative_generate",
      userId: actor.userId,
    });
    if (limited) return limited;

    const body = (await request.json()) as ServerCreativeGenerateInput;
    const result = await generateCreativeImageForActor(actor, body);

    // Never include API keys or raw provider secrets in the response.
    return NextResponse.json({
      ok: true,
      organizationId: result.organizationId,
      creativeProjectId: result.creativeProjectId,
      providerId: result.providerId,
      approvalId: result.approvalId,
      executionJobId: result.executionJobId,
      result: {
        available: result.result.available,
        generated: result.result.generated,
        status: result.result.status,
        reason: result.result.reason,
        providerId: result.result.providerId,
        // Persist-safe assets only in result.assets; preview separate.
        assets: result.productionResult.assets,
      },
      productionResult: result.productionResult,
      previewAssets: result.previewAssets ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
