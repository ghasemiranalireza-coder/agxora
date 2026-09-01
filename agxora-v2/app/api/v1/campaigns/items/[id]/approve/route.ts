import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { approveCampaignItemForActor } from "@/app/lib/business-agent/campaigns";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
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
    const item = await approveCampaignItemForActor(actor, id);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return jsonError(error);
  }
}
