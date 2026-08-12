import { NextResponse } from "next/server";
import { resetPasswordWithToken, clearSessionCookie } from "@/app/lib/auth/server";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

type Body = {
  readonly token?: string;
  readonly password?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const body = (await request.json()) as Body;
    if (!body.token || !body.password) {
      throw new PersistenceError("validation", "token and password are required");
    }
    await resetPasswordWithToken({
      token: body.token,
      password: body.password,
    });
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return authJsonError(error);
  }
}
