import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { getFinanceLogoBytesForActor, jsonError } from "@/app/lib/finance/persistence";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    const logo = await getFinanceLogoBytesForActor(actor, id);
    return new NextResponse(Buffer.from(logo.bytes), {
      status: 200,
      headers: {
        "Content-Type": logo.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${logo.fileName || "logo"}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
