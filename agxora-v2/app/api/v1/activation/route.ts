/**
 * Derived first-customer activation status.
 * Organization and actor come from the session only.
 */

import { NextResponse } from "next/server";
import { loadActivationStatus } from "@/app/lib/activation/server";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const status = await loadActivationStatus(actor);
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}
