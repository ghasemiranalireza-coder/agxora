import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { jsonError } from "@/app/lib/crm/persistence/http";
import {
  listLegalAcceptancesForActor,
  recordLegalAcceptanceForActor,
} from "@/app/lib/platform-authorization/service";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const acceptances = await listLegalAcceptancesForActor(actor);
    return NextResponse.json({ ok: true, ...acceptances });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const body = (await request.json().catch(() => ({}))) as {
      authorizationType?: string;
      platform?: string | null;
    };
    if (!body.authorizationType) {
      return NextResponse.json(
        { ok: false, message: "authorizationType is required" },
        { status: 400 },
      );
    }
    await recordLegalAcceptanceForActor(
      actor,
      body.authorizationType,
      body.platform,
    );
    const acceptances = await listLegalAcceptancesForActor(actor);
    return NextResponse.json({ ok: true, ...acceptances });
  } catch (error) {
    return jsonError(error);
  }
}
