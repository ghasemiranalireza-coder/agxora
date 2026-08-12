import { NextResponse } from "next/server";
import { logoutSession, clearSessionCookie } from "@/app/lib/auth/server";
import { readSessionToken } from "@/app/lib/tenancy/actor";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  try {
    requireDatabase();
    const token = await readSessionToken();
    await logoutSession(token);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return authJsonError(error);
  }
}
