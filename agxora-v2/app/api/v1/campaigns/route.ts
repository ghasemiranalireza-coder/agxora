import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import {
  createCampaignForActor,
  listCampaignsForActor,
  type CampaignItemDraft,
} from "@/app/lib/business-agent/campaigns";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const campaigns = await listCampaignsForActor(actor);
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      campaigns,
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
      name?: string;
      objective?: string;
      targetAudience?: string;
      channels?: CampaignItemDraft["provider"][];
      startDate?: string | null;
      endDate?: string | null;
      items?: CampaignItemDraft[];
    };
    const campaign = await createCampaignForActor(actor, {
      name: body.name ?? "",
      objective: body.objective,
      targetAudience: body.targetAudience,
      channels: body.channels,
      startDate: body.startDate,
      endDate: body.endDate,
      items: body.items,
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    return jsonError(error);
  }
}
