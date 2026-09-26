/**
 * Activate the Customer Communication Worker for the signed-in organization.
 * Request body cannot choose the organization, actor, worker id, or capabilities.
 */

import { NextResponse } from "next/server";
import { activateCommunicationWorkerForActor } from "@/app/lib/activation/server";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    await request.json().catch(() => null);
    const worker = await activateCommunicationWorkerForActor(actor);
    return NextResponse.json({
      ok: true,
      worker: {
        id: worker.id,
        role: worker.role,
        status: worker.status,
        allowedCapabilities: worker.allowedCapabilities,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
