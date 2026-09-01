import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import {
  createPlanRunForActor,
  listAgentRunsForActor,
} from "@/app/lib/business-agent/runs";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const runs = await listAgentRunsForActor(actor);
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      runs,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "integrations.mutate",
      userId: actor.userId,
    });
    if (limited) return limited;
    const body = (await request.json().catch(() => ({}))) as {
      goal?: string;
      campaignId?: string | null;
    };
    const run = await createPlanRunForActor(actor, {
      goal: body.goal ?? "",
      campaignId: body.campaignId,
    });
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return jsonError(error);
  }
}
