/**
 * Server-only private page enforcement for App Router layouts.
 * IamRouteGuard remains a client RBAC helper; this is the security boundary.
 */

import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SERVER_SESSION_COOKIE } from "@/app/lib/tenancy/sessionCookie";
import { evaluatePrivatePageAccess } from "./privateRouteAccess";

export async function enforcePrivatePageAccess(
  nextPath = "/dashboard",
): Promise<void> {
  const token =
    (await cookies()).get(SERVER_SESSION_COOKIE)?.value?.trim() || null;
  const decision = await evaluatePrivatePageAccess(token, nextPath);
  if (!decision.allow) {
    redirect(decision.redirectTo);
  }
}
