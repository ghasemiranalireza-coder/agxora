import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { getAgentRunForActor } from "@/app/lib/business-agent/runs";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly id: string }> };

export async function GET(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    const run = await getAgentRunForActor(actor, id);
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return jsonError(error);
  }
}
