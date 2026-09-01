import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { executeCampaignItemForActor } from "@/app/lib/business-agent/campaigns";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly id: string }> };

export async function POST(
  request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "integrations.mutate",
      userId: actor.userId,
    });
    if (limited) return limited;
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      kind?: "publish" | "schedule" | "send_email";
    };
    if (
      body.kind !== "publish" &&
      body.kind !== "schedule" &&
      body.kind !== "send_email"
    ) {
      throw new PersistenceError("validation", "kind must be publish, schedule, or send_email");
    }
    const item = await executeCampaignItemForActor(actor, id, body.kind);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return jsonError(error);
  }
}
