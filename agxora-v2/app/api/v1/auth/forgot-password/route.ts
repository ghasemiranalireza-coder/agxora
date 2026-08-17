import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/app/lib/auth/server";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";

export const runtime = "nodejs";

type Body = { readonly email?: string };

/**
 * Always returns a generic success shape for valid requests.
 * `delivery: "queued"` only after a successful provider handoff for an
 * existing account. Never claims email was sent without a handoff.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const limited = await rateLimitResponse({
      request,
      policyId: "auth.forgot_password",
    });
    if (limited) return limited;

    const body = (await request.json()) as Body;
    if (!body.email?.trim()) {
      throw new PersistenceError("validation", "email is required");
    }
    const result = await requestPasswordReset(body.email);
    return NextResponse.json({
      ok: true,
      delivery: result.delivery,
      // Only present when AGXORA_AUTH_EXPOSE_RESET_TOKEN=1 (dev/test)
      ...(result.resetToken ? { resetToken: result.resetToken } : {}),
      ...(result.delivery === "not_configured"
        ? {
            message:
              "Password reset accepted. Email delivery is not configured or handoff did not succeed — use a reset link from a trusted channel if available.",
          }
        : {
            message: "Password reset accepted. Email delivery was queued.",
          }),
    });
  } catch (error) {
    return authJsonError(error);
  }
}
