import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/app/lib/auth/server";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

type Body = { readonly email?: string };

/**
 * Always returns a generic success shape.
 * Never claims "email sent" unless AGXORA_AUTH_EMAIL_DELIVERY=configured.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
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
              "Password reset accepted. Email delivery is not configured yet.",
          }
        : {}),
    });
  } catch (error) {
    return authJsonError(error);
  }
}
