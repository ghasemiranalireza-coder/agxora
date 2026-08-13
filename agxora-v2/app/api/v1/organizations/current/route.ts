import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  getCurrentOrganization,
  updateCurrentOrganization,
} from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const organization = await getCurrentOrganization(actor);
    return NextResponse.json({ ok: true, organization });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const body = (await request.json()) as Record<string, unknown>;
    const organization = await updateCurrentOrganization(actor, {
      name: body.name,
      slug: body.slug,
    });
    return NextResponse.json({ ok: true, organization });
  } catch (error) {
    return jsonError(error);
  }
}
