import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "./app/lib/auth/sessionStore";

/** Public routes — no session required. */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/logout",
  "/unauthorized",
  "/forbidden",
  "/offline",
];

/** Private routes — soft/hard gated via session cookie. */
const PRIVATE_PREFIXES = ["/dashboard", "/workspace", "/onboarding"];

/** Admin-oriented routes — architecture marker for future RBAC edge checks. */
const ADMIN_PREFIXES = [
  "/dashboard/settings",
  "/dashboard/team",
  "/dashboard/finance",
  "/dashboard/automation",
];

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Soft auth gate — architecture ready for httpOnly server sessions + RBAC.
 * Local adapter sets a readable session cookie; remote providers replace this.
 *
 * Route classes: Public · Private · Admin (marker for future permission checks).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const isPrivate = matchesPrefix(pathname, PRIVATE_PREFIXES);
  const isAdmin = matchesPrefix(pathname, ADMIN_PREFIXES);
  const isAuthPage = matchesPrefix(pathname, AUTH_PAGES);
  const isPublicExact = PUBLIC_ROUTES.includes(pathname);

  // Authenticated users leave auth forms.
  if (session && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Hard gate when AGXORA_AUTH_REQUIRED=true.
  if (process.env.AGXORA_AUTH_REQUIRED === "true" && isPrivate && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Expired / missing session soft signal for private routes when hard gate off:
  // expose architecture headers for future edge logging (no UX change).
  const response = NextResponse.next();
  response.headers.set("x-agxora-route-class", isAdmin ? "admin" : isPrivate ? "private" : isPublicExact ? "public" : "public");
  if (isPrivate && !session) {
    response.headers.set("x-agxora-auth", "anonymous");
  } else if (session) {
    response.headers.set("x-agxora-auth", "session");
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workspace/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/logout",
    "/unauthorized",
    "/forbidden",
  ],
};
