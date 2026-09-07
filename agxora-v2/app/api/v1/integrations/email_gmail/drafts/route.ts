import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { executeGmailToolForActor } from "@/app/lib/business-agent/gmail-tools";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const limited = await rateLimitResponse({
      request,
      policyId: "gmail.mutate",
      userId: actor.userId,
    });
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as {
      to?: string;
      subject?: string;
      body?: string;
      cc?: string;
      inReplyTo?: string;
    };
    if (!body.to?.trim() || !body.subject?.trim()) {
      throw new PersistenceError("validation", "to and subject are required");
    }
    const result = await executeGmailToolForActor(actor, "gmail.create_draft", {
      to: body.to,
      subject: body.subject,
      body: body.body ?? "",
      cc: body.cc,
      inReplyTo: body.inReplyTo,
    });
    return NextResponse.json({ ok: true, ...((result as object) ?? {}), sent: false });
  } catch (error) {
    return jsonError(error);
  }
}
