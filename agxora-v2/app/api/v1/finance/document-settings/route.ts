import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  getDocumentSettingsForActor,
  jsonError,
  patchDocumentSettingsForActor,
} from "@/app/lib/finance/persistence";
import type { FinanceDocumentSettingsPatch } from "@/app/lib/finance/documents/types";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const settings = await getDocumentSettingsForActor(actor);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = ((await request.json()) ?? {}) as FinanceDocumentSettingsPatch;
    const settings = await patchDocumentSettingsForActor(actor, body);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return jsonError(error);
  }
}
