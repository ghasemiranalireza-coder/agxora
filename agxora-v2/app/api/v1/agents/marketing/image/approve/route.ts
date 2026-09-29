/**
 * Human approval of a marketing image preview. This does not publish.
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { reviewMarketingImageForActor } from "@/app/lib/marketing/imageServer";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => null)) as { executionId?: unknown; organizationId?: unknown } | null;
    void body?.organizationId;
    const executionId = typeof body?.executionId === "string" ? body.executionId.trim() : "";
    if (!executionId) {
      return NextResponse.json({ ok: false, error: "Marketing image fields are required." }, { status: 400 });
    }
    const result = await reviewMarketingImageForActor(actor, executionId, "approve");
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, result: result.result });
  } catch (error) {
    return jsonError(error);
  }
}
