/**
 * Secure httpOnly session cookie helpers for Phase 43 auth.
 */

import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SERVER_SESSION_COOKIE } from "@/app/lib/tenancy/actor";

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

export function applySessionCookie(
  response: NextResponse,
  token: string,
  maxAge = SESSION_MAX_AGE_SECONDS,
): void {
  response.cookies.set({
    name: SERVER_SESSION_COOKIE,
    value: token,
    ...sessionCookieOptions(maxAge),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SERVER_SESSION_COOKIE,
    value: "",
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export async function readSessionCookieValue(): Promise<string | null> {
  const store = await cookies();
  return store.get(SERVER_SESSION_COOKIE)?.value?.trim() || null;
}
