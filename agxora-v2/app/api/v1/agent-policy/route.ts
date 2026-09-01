import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import {
  getAgentPolicyForActor,
  setAgentPolicyForActor,
} from "@/app/lib/business-agent/policy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireCurrentActor } from "@/app/lib/tenancy";
import type { AutonomyMode } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const policy = await getAgentPolicyForActor(actor);
    return NextResponse.json({ ok: true, policy });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "integrations.mutate",
      userId: actor.userId,
    });
    if (limited) return limited;
    const body = (await request.json().catch(() => ({}))) as { mode?: string };
    if (
      body.mode !== "SAFE" &&
      body.mode !== "ASSISTED" &&
      body.mode !== "AUTONOMOUS"
    ) {
      throw new PersistenceError("validation", "Invalid autonomy mode");
    }
    const policy = await setAgentPolicyForActor(actor, body.mode as AutonomyMode);
    return NextResponse.json({ ok: true, policy });
  } catch (error) {
    return jsonError(error);
  }
}
