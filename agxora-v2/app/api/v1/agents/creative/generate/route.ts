/**
 * Phase 59 — Server creative image generation boundary.
 * POST /api/v1/agents/creative/generate
 *
 * Secrets stay server-side. Actor organization is authoritative.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import {
  generateCreativeImageForActor,
  type ServerCreativeGenerateInput,
} from "@/app/lib/creative/generate";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json()) as ServerCreativeGenerateInput;

    const result = await generateCreativeImageForActor(actor, body);

    // Never include API keys or raw provider secrets in the response.
    return NextResponse.json({
      ok: true,
      organizationId: result.organizationId,
      creativeProjectId: result.creativeProjectId,
      providerId: result.providerId,
      result: {
        available: result.result.available,
        generated: result.result.generated,
        status: result.result.status,
        reason: result.result.reason,
        providerId: result.result.providerId,
        assets: result.result.assets,
      },
      productionResult: result.productionResult,
    });
  } catch (error) {
    return jsonError(error);
  }
}
