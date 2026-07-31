"use client";

import type { JSX, ReactNode } from "react";
import { AccessState } from "@/app/components/identity";
import {
  assertAccess,
  roleGuard,
  type RoleLike,
} from "@/app/lib/backend/security";
import type { IdentityRole, ModuleAccessKey } from "@/app/lib/identity/types";
import type { MembershipRole } from "@/app/lib/organization/types";

/**
 * RoleGuard — renders children only when role is allowed.
 * Architecture host; uses existing AccessState for denial UI.
 */
export function RoleGuard({
  role,
  allowed,
  children,
}: {
  readonly role: RoleLike;
  readonly allowed: readonly (MembershipRole | IdentityRole)[];
  readonly children: ReactNode;
}): JSX.Element {
  if (!roleGuard(role, allowed)) {
    return <AccessState code="forbidden" />;
  }
  return <>{children}</>;
}

/**
 * RouteGuard — module/path access gate for nested layouts.
 */
export function RouteGuard({
  authenticated,
  role,
  module,
  pathname,
  children,
}: {
  readonly authenticated: boolean;
  readonly role?: RoleLike;
  readonly module?: ModuleAccessKey;
  readonly pathname?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const result = assertAccess({ authenticated, role, module, pathname });
  if (!result.ok) {
    return (
      <AccessState
        code={result.reason === "unauthorized" ? "unauthorized" : "forbidden"}
        detail={result.message}
      />
    );
  }
  return <>{children}</>;
}
