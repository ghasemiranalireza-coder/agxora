/**
 * Phase 56 — Agent OS org-scoped state API.
 * GET/PUT /api/v1/agents/os-state
 *
 * organizationId is derived from the authenticated session membership only.
 */

import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import {
  getAgentOsStateForActor,
  putAgentOsStateForActor,
} from "@/app/lib/agents/persistence";
import type { AgentsPersistedState } from "@/features/agents/repositories";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const state = await getAgentOsStateForActor(actor);
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      state,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json()) as {
      state?: AgentsPersistedState;
      organizationId?: string;
    };

    // Client-supplied organizationId is never authoritative.
    void body.organizationId;

    const state = await putAgentOsStateForActor(actor, body?.state);
    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      state,
    });
  } catch (error) {
    return jsonError(error);
  }
}
