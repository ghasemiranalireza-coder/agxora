import { NextResponse } from "next/server";
import { createEmailVerificationToken } from "@/app/lib/auth/server";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

/**
 * Issues a hashed email-verification token for the current session user
 * and attempts Phase 45 email delivery.
 */
export async function POST(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const result = await createEmailVerificationToken(actor.userId);
    const expose = process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN === "1";
    return NextResponse.json({
      ok: true,
      delivery: result.delivery,
      ...(expose ? { verificationToken: result.rawToken } : {}),
      ...(result.delivery === "not_configured"
        ? {
            message:
              "Verification token created. Email delivery is not configured or handoff did not succeed.",
          }
        : {
            message: "Verification email delivery was queued.",
          }),
    });
  } catch (error) {
    return authJsonError(error);
  }
}
