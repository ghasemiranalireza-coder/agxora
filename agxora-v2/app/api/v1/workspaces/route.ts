import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  createWorkspace,
  listWorkspacesForActor,
} from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const workspaces = await listWorkspacesForActor(actor);
    return NextResponse.json({
      ok: true,
      workspaces,
      activeWorkspaceId: actor.workspaceId,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const body = (await request.json()) as Record<string, unknown>;
    const workspace = await createWorkspace(actor, { name: body.name });
    return NextResponse.json({ ok: true, workspace }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
