import { NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/app/lib/auth/server";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";

export const runtime = "nodejs";

type Body = { readonly token?: string };

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const limited = await rateLimitResponse({
      request,
      policyId: "auth.verify_email",
    });
    if (limited) return limited;

    const body = (await request.json()) as Body;
    if (!body.token?.trim()) {
      throw new PersistenceError("validation", "token is required");
    }
    const user = await verifyEmailWithToken(body.token);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return authJsonError(error);
  }
}
