/**
 * Backend route-guard helpers for Next.js middleware / edge.
 * Complements root middleware.ts — architecture only.
 */

export type RouteClass = "public" | "private" | "admin";

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
  "/offline",
] as const;

export const PRIVATE_ROUTE_PREFIXES = [
  "/dashboard",
  "/workspace",
  "/onboarding",
] as const;

export const ADMIN_ROUTE_PREFIXES = [
  "/dashboard/settings",
  "/dashboard/team",
  "/dashboard/finance",
  "/dashboard/automation",
] as const;

export function matchesPrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function classifyRoute(pathname: string): RouteClass {
  if (matchesPrefix(pathname, ADMIN_ROUTE_PREFIXES)) return "admin";
  if (matchesPrefix(pathname, PRIVATE_ROUTE_PREFIXES)) return "private";
  return "public";
}

export function isPublicPath(pathname: string): boolean {
  return (PUBLIC_ROUTE_PATHS as readonly string[]).includes(pathname);
}
