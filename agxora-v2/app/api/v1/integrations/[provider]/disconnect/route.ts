import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { disconnectIntegrationForActor } from "@/app/lib/business-agent/integrations";
import { isIntegrationProviderId } from "@/app/lib/business-agent/catalog";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly provider: string }> };

export async function POST(
  request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "agents.social_connect",
      userId: actor.userId,
    });
    if (limited) return limited;

    const { provider } = await context.params;
    if (!isIntegrationProviderId(provider)) {
      throw new PersistenceError("validation", "Unknown integration provider");
    }
    await disconnectIntegrationForActor(actor, provider);
    return NextResponse.json({ ok: true, provider, disconnected: true });
  } catch (error) {
    return jsonError(error);
  }
}
