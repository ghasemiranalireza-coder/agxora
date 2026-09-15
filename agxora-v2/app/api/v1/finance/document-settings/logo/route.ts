import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  jsonError,
  removeFinanceLogoForActor,
  uploadFinanceLogoForActor,
} from "@/app/lib/finance/persistence";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const form = await request.formData();
    const file = form.get("logo");
    if (!(file instanceof File)) {
      throw new PersistenceError("validation", "A logo file is required");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const settings = await uploadFinanceLogoForActor(actor, {
      bytes,
      fileName: file.name || "logo",
      claimedType: file.type,
    });
    return NextResponse.json({ ok: true, settings }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const settings = await removeFinanceLogoForActor(actor);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return jsonError(error);
  }
}
