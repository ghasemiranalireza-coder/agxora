import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { persistenceProviderFromUnknown } from "@/app/lib/business-agent/catalog";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { setAutomaticPublishingForActor } from "@/app/lib/platform-authorization/service";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly provider: string }> };

export async function PUT(
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

    const { provider } = await context.params;
    const persistenceId = persistenceProviderFromUnknown(provider);
    if (!persistenceId) {
      throw new PersistenceError("validation", "Unknown integration provider");
    }
    const body = (await request.json().catch(() => ({}))) as {
      enabled?: boolean;
      confirmed?: boolean;
      contentTypes?: string[];
      frequency?: string | null;
      accountLabel?: string | null;
    };
    await setAutomaticPublishingForActor(actor, persistenceId, {
      enabled: body.enabled === true,
      confirmed: body.confirmed === true,
      contentTypes: Array.isArray(body.contentTypes) ? body.contentTypes : [],
      frequency: body.frequency ?? null,
      accountLabel: body.accountLabel ?? null,
    });
    return NextResponse.json({
      ok: true,
      provider: persistenceId,
      automaticPublishing: body.enabled === true,
    });
  } catch (error) {
    return jsonError(error);
  }
}
