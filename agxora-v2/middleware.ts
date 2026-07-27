import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "./app/lib/auth/sessionStore";

const PROTECTED_PREFIXES = ["/dashboard", "/workspace", "/onboarding"];
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/**
 * Soft auth gate — architecture ready for httpOnly server sessions.
 * Local adapter sets a readable session cookie; remote providers replace this.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Soft gate: allow browsing dashboard without forcing login in local mode,
  // but redirect authenticated users away from auth pages.
  if (session && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Optional hard gate via env for future production.
  if (
    process.env.AGXORA_AUTH_REQUIRED === "true" &&
    isProtected &&
    !session
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
  ],
};
