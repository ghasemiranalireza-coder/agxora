import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "./app/lib/auth/sessionStore";
import { SERVER_SESSION_COOKIE } from "./app/lib/tenancy/sessionCookie";
import {
  AUTH_PAGE_PREFIXES,
  ADMIN_ROUTE_PREFIXES,
  PRIVATE_ROUTE_PREFIXES,
  isPublicPath,
  matchesPrefix,
} from "./app/lib/production/routes";
import { applySecurityHeaders } from "./app/lib/production/securityHeaders";
import { validateSessionToken } from "./app/lib/production/security";

/**
 * Soft auth gate — Phase 43 prefers httpOnly server session cookie.
 * Local demo cookie remains recognized only for AUTH_MODE=local.
 *
 * Next.js 16: `proxy.ts` replaces deprecated `middleware.ts`.
 * Real authorization still happens server-side in API/actions.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localSession = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const serverSession = request.cookies.get(SERVER_SESSION_COOKIE)?.value;
  const session = serverSession || localSession;
  const hasSession = Boolean(session);
  const tokenCheck = validateSessionToken(session);
  const isPrivate = matchesPrefix(pathname, PRIVATE_ROUTE_PREFIXES);
  const isAdmin = matchesPrefix(pathname, ADMIN_ROUTE_PREFIXES);
  const isAuthPage = matchesPrefix(pathname, AUTH_PAGE_PREFIXES);
  const isPublicExact = isPublicPath(pathname);

  // Authenticated users leave auth forms.
  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect.headers);
    return redirect;
  }

  // Hard gate when AGXORA_AUTH_REQUIRED=true.
  if (process.env.AGXORA_AUTH_REQUIRED === "true" && isPrivate && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect.headers);
    return redirect;
  }

  // Soft signal headers for private routes when hard gate off (no UX change).
  const response = NextResponse.next();
  applySecurityHeaders(response.headers);
  response.headers.set(
    "x-agxora-route-class",
    isAdmin ? "admin" : isPrivate ? "private" : isPublicExact ? "public" : "public",
  );
  if (isPrivate && !hasSession) {
    response.headers.set("x-agxora-auth", "anonymous");
  } else if (hasSession) {
    response.headers.set("x-agxora-auth", serverSession ? "server-session" : "session");
  }
  if (hasSession && !tokenCheck.valid && tokenCheck.reason) {
    response.headers.set("x-agxora-session-check", tokenCheck.reason);
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
