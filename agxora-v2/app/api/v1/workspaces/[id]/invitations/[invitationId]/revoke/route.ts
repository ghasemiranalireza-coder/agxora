import { NextResponse } from "next/server";
import { requireActorForWorkspace } from "@/app/lib/tenancy";
import { revokeInvitation } from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

type Ctx = {
  readonly params: Promise<{ readonly id: string; readonly invitationId: string }>;
};

export async function POST(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { id, invitationId } = await context.params;
    const actor = await requireActorForWorkspace(id);
    const invitation = await revokeInvitation(actor, invitationId);
    return NextResponse.json({ ok: true, invitation });
  } catch (error) {
    return jsonError(error);
  }
}
