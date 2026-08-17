import type { MembershipRole } from "@/app/lib/organization/types";
import type { IdentityRole, ModuleAccessKey } from "@/app/lib/identity/types";
import { canAccessModule, toIdentityRole } from "@/app/lib/identity/permissions";
import type { ApiFailure } from "../types/api";

export type RoleLike = MembershipRole | IdentityRole | null | undefined;

/** Central permission check — composes identity module matrix. */
export function checkPermission(
  role: RoleLike,
  module: ModuleAccessKey,
): boolean {
  return canAccessModule(role, module);
}

/** Role guard — allow if role is in the allowed set. */
export function roleGuard(
  role: RoleLike,
  allowed: readonly (MembershipRole | IdentityRole)[],
): boolean {
  if (!role) return false;
  const identity = (
    ["owner", "admin", "manager", "employee", "guest"] as const
  ).includes(role as IdentityRole)
    ? (role as IdentityRole)
    : toIdentityRole(role as MembershipRole);
  return allowed.some((entry) => {
    const allowedIdentity = (
      ["owner", "admin", "manager", "employee", "guest"] as const
    ).includes(entry as IdentityRole)
      ? (entry as IdentityRole)
      : toIdentityRole(entry as MembershipRole);
    return allowedIdentity === identity;
  });
}

const PATH_TO_MODULE: ReadonlyArray<{
  readonly prefix: string;
  readonly module: ModuleAccessKey;
}> = [
  { prefix: "/dashboard/finance", module: "finance" },
  { prefix: "/dashboard/crm", module: "crm" },
  { prefix: "/dashboard/documents", module: "documents" },
  { prefix: "/dashboard/automation", module: "automation" },
  { prefix: "/dashboard/settings", module: "settings" },
  { prefix: "/dashboard/creator", module: "creator" },
  { prefix: "/dashboard/projects", module: "projects" },
  { prefix: "/dashboard/team", module: "team" },
];

function moduleForPath(pathname: string): ModuleAccessKey | null {
  const hit = PATH_TO_MODULE.find(
    (row) => pathname === row.prefix || pathname.startsWith(`${row.prefix}/`),
  );
  return hit?.module ?? null;
}

/** Route guard — path access for a role via module matrix. */
export function routeGuard(pathname: string, role: RoleLike): boolean {
  const accessModule = moduleForPath(pathname);
  if (!accessModule) return true;
  return checkPermission(role, accessModule);
}

/**
 * API guard placeholder — future server-side token / scope checks.
 * Returns null when allowed; ApiFailure when denied.
 */
export function apiGuard(input: {
  authenticated: boolean;
  role?: RoleLike;
  module?: ModuleAccessKey;
}): ApiFailure | null {
  if (!input.authenticated) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "errors.codes.AUTH_SIGN_IN_REQUIRED",
      status: 401,
    };
  }
  if (input.module && !checkPermission(input.role, input.module)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "errors.codes.AUTH_INSUFFICIENT_PERMISSIONS",
      status: 403,
    };
  }
  return null;
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "forbidden"; message: string };

export function assertAccess(input: {
  authenticated: boolean;
  role?: RoleLike;
  module?: ModuleAccessKey;
  pathname?: string;
}): GuardResult {
  if (!input.authenticated) {
    return {
      ok: false,
      reason: "unauthorized",
      message: "errors.signInRequired",
    };
  }
  if (input.pathname && !routeGuard(input.pathname, input.role ?? null)) {
    return {
      ok: false,
      reason: "forbidden",
      message: "errors.noRouteAccess",
    };
  }
  if (input.module && !checkPermission(input.role, input.module)) {
    return {
      ok: false,
      reason: "forbidden",
      message: "errors.codes.AUTH_INSUFFICIENT_PERMISSIONS",
    };
  }
  return { ok: true };
}
