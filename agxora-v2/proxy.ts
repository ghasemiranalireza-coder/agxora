import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "./app/lib/auth/sessionStore";
import { SERVER_SESSION_COOKIE } from "./app/lib/tenancy/sessionCookie";
import {
  ADMIN_ROUTE_PREFIXES,
  PRIVATE_ROUTE_PREFIXES,
  isPublicPath,
  matchesPrefix,
} from "./app/lib/production/routes";
import { applySecurityHeaders } from "./app/lib/production/securityHeaders";
import { describeSessionCookie } from "./app/lib/production/security";
import { isAuthRequired, isProductionRuntime } from "./app/lib/production/env";

/**
 * Coarse Edge gate — cookie presence is NOT authentication.
 *
 * Next.js 16: `proxy.ts` replaces deprecated `middleware.ts`.
 * Real session validation (hash + DB + expiry + revocation) runs in
 * Node server layouts via `enforcePrivatePageAccess`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localSession = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const serverSession = request.cookies.get(SERVER_SESSION_COOKIE)?.value;
  const session = serverSession || localSession;
  const cookie = describeSessionCookie(session);
  const isPrivate = matchesPrefix(pathname, PRIVATE_ROUTE_PREFIXES);
  const isAdmin = matchesPrefix(pathname, ADMIN_ROUTE_PREFIXES);
  const isPublicExact = isPublicPath(pathname);
  const authRequired = isAuthRequired();

  // Do not bounce auth forms based on cookie presence — the token may be fake.
  // Valid sessions are handled after login by the server auth adapter.

  // Coarse missing-cookie redirect when auth is required.
  // Invalid/expired/revoked cookies are rejected by the Node layout, not here.
  if (authRequired && isPrivate && !cookie.present) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect.headers, isProductionRuntime());
    return redirect;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response.headers, isProductionRuntime());
  response.headers.set(
    "x-agxora-route-class",
    isAdmin ? "admin" : isPrivate ? "private" : isPublicExact ? "public" : "public",
  );
  if (isPrivate && !cookie.present) {
    response.headers.set("x-agxora-auth", "anonymous");
  } else if (cookie.present) {
    response.headers.set(
      "x-agxora-auth",
      serverSession ? "cookie-present" : "local-cookie-present",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workspace/:path*",
    "/onboarding/:path*",
    "/welcome",
    "/demo",
    "/pricing",
    "/contact",
    "/contact-sales",
    "/privacy",
    "/terms",
    "/cookies",
    "/imprint",
    "/offline",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/logout",
    "/unauthorized",
    "/forbidden",
    "/session-expired",
    "/account-locked",
  ],
};
