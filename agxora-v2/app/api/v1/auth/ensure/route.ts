/**
 * Phase 42.1 development identity bootstrap — DISABLED in Phase 43.
 *
 * Previously accepted client-presented email + accessToken without password
 * verification. That is not production authentication.
 *
 * Use /api/v1/auth/register and /api/v1/auth/login instead.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: false,
      code: "gone",
      message:
        "GET /api/v1/auth/ensure is retired. Use /api/v1/auth/register or /api/v1/auth/login. Client identity claims are not trusted.",
    },
    { status: 410 },
  );
}

export async function GET(): Promise<NextResponse> {
  return POST();
}
