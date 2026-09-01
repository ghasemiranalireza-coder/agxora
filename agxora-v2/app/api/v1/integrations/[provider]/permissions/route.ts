import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import {
  getPermissionFlagsForActor,
  updatePermissionsForActor,
} from "@/app/lib/business-agent/integrations";
import { isIntegrationProviderId } from "@/app/lib/business-agent/catalog";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly provider: string }> };

export async function GET(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const { provider } = await context.params;
    if (!isIntegrationProviderId(provider)) {
      throw new PersistenceError("validation", "Unknown integration provider");
    }
    const permissions = await getPermissionFlagsForActor(actor, provider);
    return NextResponse.json({ ok: true, provider, permissions });
  } catch (error) {
    return jsonError(error);
  }
}

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
    if (!isIntegrationProviderId(provider)) {
      throw new PersistenceError("validation", "Unknown integration provider");
    }
    const body = (await request.json().catch(() => ({}))) as {
      canRead?: boolean;
      canCreateDraft?: boolean;
      canSchedule?: boolean;
      canPublish?: boolean;
      canSendEmail?: boolean;
      canDelete?: boolean;
    };
    const permissions = await updatePermissionsForActor(actor, provider, body);
    return NextResponse.json({ ok: true, provider, permissions });
  } catch (error) {
    return jsonError(error);
  }
}
