import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/app/lib/auth/server";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";

export const runtime = "nodejs";

type Body = { readonly email?: string };

/**
 * Always returns a generic success shape for valid requests.
 * Does not reveal whether the address exists or whether mail was queued.
 * `delivery` / `resetToken` are returned only when AGXORA_AUTH_EXPOSE_RESET_TOKEN=1.
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
    const expose = process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN === "1";
    // Public JSON must not reveal whether the address exists or whether mail queued.
    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for this email, a reset link will be sent when email delivery is configured.",
      ...(expose
        ? {
            delivery: result.delivery,
            ...(result.resetToken ? { resetToken: result.resetToken } : {}),
          }
        : {}),
    });
  } catch (error) {
    return authJsonError(error);
  }
}
