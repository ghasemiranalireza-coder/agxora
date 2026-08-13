import { NextResponse } from "next/server";
import { requireActorForWorkspace } from "@/app/lib/tenancy";
import { changeMemberRole, removeMember } from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

type Ctx = {
  readonly params: Promise<{ readonly id: string; readonly userId: string }>;
};

export async function PATCH(
  request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { id, userId } = await context.params;
    const actor = await requireActorForWorkspace(id);
    const body = (await request.json()) as Record<string, unknown>;
    const member = await changeMemberRole(actor, userId, body.role);
    return NextResponse.json({ ok: true, member });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { id, userId } = await context.params;
    const actor = await requireActorForWorkspace(id);
    await removeMember(actor, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
