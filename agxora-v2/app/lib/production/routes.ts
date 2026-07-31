/**
 * Canonical route classification — shared by proxy, backend middleware helpers, IAM.
 * Preserves Phase 28 route semantics (public exact / private prefixes / admin markers).
 */

export const PUBLIC_ROUTE_PATHS = [
  "/",
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
  "/offline",
] as const;

export const AUTH_PAGE_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

export const PRIVATE_ROUTE_PREFIXES = [
  "/dashboard",
  "/workspace",
  "/onboarding",
] as const;

/** Admin-oriented markers for future RBAC edge checks. */
export const ADMIN_ROUTE_PREFIXES = [
  "/dashboard/settings",
  "/dashboard/team",
  "/dashboard/identity",
  "/dashboard/billing/admin",
  "/dashboard/finance",
  "/dashboard/automation",
] as const;

export type RouteClass = "public" | "private" | "admin";

export function matchesPrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPublicPath(pathname: string): boolean {
  return (PUBLIC_ROUTE_PATHS as readonly string[]).includes(pathname);
}

export function classifyRoute(pathname: string): RouteClass {
  if (matchesPrefix(pathname, ADMIN_ROUTE_PREFIXES)) return "admin";
  if (matchesPrefix(pathname, PRIVATE_ROUTE_PREFIXES)) return "private";
  return "public";
}

/** Proxy matcher — identical coverage to the former middleware.ts. */
export const PROXY_MATCHER = [
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
  "/session-expired",
  "/account-locked",
] as const;
