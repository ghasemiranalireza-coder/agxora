import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { switchWorkspaceForActor } from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly id: string }> };

export async function POST(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const { id } = await context.params;
    if (!id?.trim()) {
      throw new PersistenceError("validation", "workspaceId is required", {
        status: 422,
      });
    }
    const result = await switchWorkspaceForActor(actor, id.trim());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
