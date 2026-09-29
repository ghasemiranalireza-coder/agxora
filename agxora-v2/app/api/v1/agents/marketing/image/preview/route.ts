/**
 * Preview bytes for one marketing image owned by the signed-in organization.
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { readMarketingImagePreview } from "@/app/lib/marketing/imageServer";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const executionId = new URL(request.url).searchParams.get("executionId")?.trim() ?? "";
    if (!executionId) {
      return NextResponse.json({ ok: false, error: "Marketing image fields are required." }, { status: 400 });
    }
    const result = await readMarketingImagePreview(actor, executionId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
