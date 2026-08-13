import { NextResponse } from "next/server";
import { previewInvitation } from "@/app/lib/control-plane";
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
    const invitation = await previewInvitation(decodeURIComponent(token));
    return NextResponse.json({ ok: true, invitation });
  } catch (error) {
    return jsonError(error);
  }
}
