import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { acceptInvitation } from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly token: string }> };

export async function POST(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const { token } = await context.params;
    const result = await acceptInvitation(actor, decodeURIComponent(token));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
