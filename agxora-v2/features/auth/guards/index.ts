/**
 * IAM route / role / permission guards — architecture only.
 * Wire into layouts later without changing existing module pages.
 */

import {
  normalizeIamRole,
  roleHasPermission,
} from "./permissionMatrix";
import type { IamRole, IamRouteClass, IamRouteDefinition } from "../types";

export const IAM_PUBLIC_ROUTES: readonly string[] = [
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
];

export const IAM_PRIVATE_PREFIXES: readonly string[] = [
  "/dashboard",
  "/workspace",
  "/onboarding",
];

export const IAM_ADMIN_PREFIXES: readonly string[] = [
  "/dashboard/settings",
  "/dashboard/team",
  "/dashboard/identity",
  "/dashboard/billing/admin",
  "/dashboard/finance",
  "/dashboard/automation",
];

export const IAM_ROUTE_CATALOG: readonly IamRouteDefinition[] = [
  { path: "/login", routeClass: "public" },
  { path: "/register", routeClass: "public" },
  { path: "/forgot-password", routeClass: "public" },
  { path: "/reset-password", routeClass: "public" },
  { path: "/verify-email", routeClass: "public" },
  { path: "/session-expired", routeClass: "public" },
  { path: "/account-locked", routeClass: "public" },
  { path: "/unauthorized", routeClass: "public" },
  { path: "/forbidden", routeClass: "public" },
  { path: "/dashboard", routeClass: "private" },
  {
    path: "/dashboard/settings",
    routeClass: "admin",
    requiredPermission: "settings.manage",
  },
  {
    path: "/dashboard/team",
    routeClass: "admin",
    requiredPermission: "team.manage",
    requiredRole: ["owner", "admin", "manager"],
  },
  {
    path: "/dashboard/identity",
    routeClass: "admin",
    requiredPermission: "settings.manage",
  },
  { path: "/dashboard/profile", routeClass: "private" },
] as const;

export function classifyIamRoute(pathname: string): IamRouteClass {
  if (IAM_PUBLIC_ROUTES.includes(pathname)) return "public";
  if (
    IAM_ADMIN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return "admin";
  }
  if (
    IAM_PRIVATE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return "private";
  }
  return "public";
}

export function canAccessWithRole(
  role: string | null | undefined,
  allowed: readonly IamRole[],
): boolean {
  const normalized = normalizeIamRole(role);
  if (!normalized) return false;
  return allowed.includes(normalized);
}

export function canAccessWithPermission(
  role: string | null | undefined,
  permissionId: string,
): boolean {
  return roleHasPermission(role, permissionId);
}

export interface GuardDecision {
  readonly allowed: boolean;
  readonly reason?: "unauthorized" | "forbidden" | "expired_session" | "account_locked";
  readonly message?: string;
}

export function evaluateAccess(input: {
  readonly authenticated: boolean;
  readonly sessionExpired?: boolean;
  readonly accountLocked?: boolean;
  readonly role?: string | null;
  readonly requiredRoles?: readonly IamRole[];
  readonly requiredPermission?: string;
}): GuardDecision {
  if (input.accountLocked) {
    return {
      allowed: false,
      reason: "account_locked",
      message: "This account is locked. Contact an administrator.",
    };
  }
  if (input.sessionExpired) {
    return {
      allowed: false,
      reason: "expired_session",
      message: "Your session expired. Sign in again.",
    };
  }
  if (!input.authenticated) {
    return {
      allowed: false,
      reason: "unauthorized",
      message: "Sign in to continue.",
    };
  }
  if (
    input.requiredRoles &&
    input.requiredRoles.length > 0 &&
    !canAccessWithRole(input.role, input.requiredRoles)
  ) {
    return {
      allowed: false,
      reason: "forbidden",
      message: "Your role cannot access this resource.",
    };
  }
  if (
    input.requiredPermission &&
    !canAccessWithPermission(input.role, input.requiredPermission)
  ) {
    return {
      allowed: false,
      reason: "forbidden",
      message: `Missing permission: ${input.requiredPermission}`,
    };
  }
  return { allowed: true };
}

export {
  IAM_PERMISSIONS,
  IAM_ROLES,
  normalizeIamRole,
  roleHasPermission,
  listPermissionsForRole,
  buildPermissionMatrix,
  getIamRoleDefinition,
} from "./permissionMatrix";
