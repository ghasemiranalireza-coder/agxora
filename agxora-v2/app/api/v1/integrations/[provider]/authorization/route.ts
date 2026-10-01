import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { persistenceProviderFromUnknown } from "@/app/lib/business-agent/catalog";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { authorizationPreview } from "@/app/lib/platform-authorization/service";
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
    await requireCurrentActor();
    const { provider } = await context.params;
    const persistenceId = persistenceProviderFromUnknown(provider);
    if (!persistenceId) {
      throw new PersistenceError("validation", "Unknown integration provider");
    }
    return NextResponse.json({
      ok: true,
      ...authorizationPreview(persistenceId, null),
    });
  } catch (error) {
    return jsonError(error);
  }
}
