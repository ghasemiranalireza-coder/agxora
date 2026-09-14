import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { listCanonicalProvidersForActor, listIntegrationsForActor } from "@/app/lib/business-agent/integrations";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const [integrations, providers] = await Promise.all([
      listIntegrationsForActor(actor),
      listCanonicalProvidersForActor(actor),
    ]);
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      integrations,
      providers,
    });
  } catch (error) {
    return jsonError(error);
  }
}
