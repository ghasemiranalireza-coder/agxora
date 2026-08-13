import { NextResponse } from "next/server";
import { requireActorForWorkspace } from "@/app/lib/tenancy";
import { archiveWorkspace } from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly id: string }> };

export async function POST(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { id } = await context.params;
    const actor = await requireActorForWorkspace(id);
    const workspace = await archiveWorkspace(actor);
    return NextResponse.json({ ok: true, workspace });
  } catch (error) {
    return jsonError(error);
  }
}
