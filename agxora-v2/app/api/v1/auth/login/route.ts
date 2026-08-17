import { NextResponse } from "next/server";
import { loginWithPassword } from "@/app/lib/auth/server";
import {
  authJsonError,
  authSuccessResponse,
  requireDatabase,
} from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";

export const runtime = "nodejs";

type Body = {
  readonly email?: string;
  readonly password?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const limited = await rateLimitResponse({
      request,
      policyId: "auth.login",
    });
    if (limited) return limited;

    const body = (await request.json()) as Body;
    if (!body.email || !body.password) {
      throw new PersistenceError("validation", "email and password are required");
    }
    const result = await loginWithPassword({
      email: body.email,
      password: body.password,
    });
    return authSuccessResponse(result);
  } catch (error) {
    return authJsonError(error);
  }
}
