import { NextResponse } from "next/server";
import { registerWithPassword } from "@/app/lib/auth/server";
import {
  authJsonError,
  authSuccessResponse,
  requireDatabase,
} from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

type Body = {
  readonly email?: string;
  readonly password?: string;
  readonly displayName?: string;
  readonly companyName?: string;
  readonly acceptTerms?: boolean;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const body = (await request.json()) as Body;
    if (body.acceptTerms === false) {
      throw new PersistenceError(
        "validation",
        "You must accept the terms to continue.",
      );
    }
    if (!body.email || !body.password || !body.displayName) {
      throw new PersistenceError(
        "validation",
        "email, password, and displayName are required",
      );
    }
    const result = await registerWithPassword({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      companyName: body.companyName,
    });
    return authSuccessResponse(result);
  } catch (error) {
    return authJsonError(error);
  }
}
