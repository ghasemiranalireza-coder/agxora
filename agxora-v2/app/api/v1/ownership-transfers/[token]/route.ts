import { NextResponse } from "next/server";
import { previewOwnershipTransfer } from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly token: string }> };

export async function GET(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { token } = await context.params;
    const transfer = await previewOwnershipTransfer(decodeURIComponent(token));
    return NextResponse.json({ ok: true, transfer });
  } catch (error) {
    return jsonError(error);
  }
}
