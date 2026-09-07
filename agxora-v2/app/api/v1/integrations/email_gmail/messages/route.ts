import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { executeGmailToolForActor } from "@/app/lib/business-agent/gmail-tools";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? undefined;
    const maxRaw = url.searchParams.get("maxResults");
    const maxResults = maxRaw ? Number.parseInt(maxRaw, 10) : undefined;
    const result = await executeGmailToolForActor(actor, "gmail.list_messages", {
      query,
      maxResults: Number.isFinite(maxResults) ? maxResults : undefined,
    });
    const serialized = JSON.stringify(result);
    if (/access_token|refresh_token|client_secret|ya29\./i.test(serialized)) {
      return NextResponse.json(
        { ok: false, message: "Refusing to return credential material" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, ...((result as object) ?? {}) });
  } catch (error) {
    return jsonError(error);
  }
}
