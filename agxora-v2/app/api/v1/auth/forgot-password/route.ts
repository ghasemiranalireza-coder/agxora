import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/app/lib/auth/server";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";

export const runtime = "nodejs";

type Body = { readonly email?: string };

/**
 * Always returns a generic success shape for valid requests (anti-enumeration).
 * `delivery` matches the current provider configuration for both existing and
 * unknown emails. Never claims a handoff succeeded when the provider is missing.
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
      // Only present when AGXORA_AUTH_EXPOSE_RESET_TOKEN=1 (never in production)
      ...(result.resetToken ? { resetToken: result.resetToken } : {}),
      message:
        "If an account exists for that email, password reset instructions will be sent when email delivery is configured.",
    });
  } catch (error) {
    return authJsonError(error);
  }
}
