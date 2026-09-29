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
import { LEGACY_CREATIVE_GENERATE_CLOSED } from "@/app/lib/creative/legacyGenerateGate";

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

    // Authenticated customers can still reach this URL. The creative tab is
    // not on the first-customer path, and this route does not enforce
    // MARKETING_CREATE_IMAGE, entitlement, or governed allowance. Refuse
    // before any provider, storage, or execution work.
    return NextResponse.json(LEGACY_CREATIVE_GENERATE_CLOSED, { status: 410 });
  } catch (error) {
    return jsonError(error);
  }
}
