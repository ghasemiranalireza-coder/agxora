/**
 * Read and confirm organization business facts.
 * Confirmation is the approval. The session organization is the tenant.
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { confirmBusinessFactForActor, listBusinessFactsForActor } from "@/app/lib/marketing/businessFactServer";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    void url.searchParams.get("organizationId");
    void url.searchParams.get("authoritative");
    void url.searchParams.get("status");
    void url.searchParams.get("provenance");
    const memoryId = url.searchParams.get("memoryId")?.trim() || undefined;
    const result = await listBusinessFactsForActor(actor, memoryId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      facts: result.facts,
      needsAttention: result.needsAttention,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "agents.business_fact",
      userId: actor.userId,
    });
    if (limited) return limited;
    const body = (await request.json().catch(() => null)) as Parameters<typeof confirmBusinessFactForActor>[1];
    const result = await confirmBusinessFactForActor(actor, body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, replayed: result.replayed, result: result.result });
  } catch (error) {
    return jsonError(error);
  }
}
