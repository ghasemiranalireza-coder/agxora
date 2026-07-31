"use client";

import type { JSX, ReactNode } from "react";
import { AccessState } from "@/app/components/identity";
import { evaluateAccess } from "../guards";
import type { IamRole } from "../types";

export function IamRoleGuard({
  role,
  allowed,
  children,
}: {
  readonly role: string | null | undefined;
  readonly allowed: readonly IamRole[];
  readonly children: ReactNode;
}): JSX.Element {
  const decision = evaluateAccess({
    authenticated: Boolean(role),
    role,
    requiredRoles: allowed,
  });
  if (!decision.allowed) {
    return (
      <AccessState
        code={decision.reason === "unauthorized" ? "unauthorized" : "forbidden"}
        detail={decision.message}
      />
    );
  }
  return <>{children}</>;
}

export function IamPermissionGuard({
  authenticated,
  role,
  permission,
  children,
}: {
  readonly authenticated: boolean;
  readonly role: string | null | undefined;
  readonly permission: string;
  readonly children: ReactNode;
}): JSX.Element {
  const decision = evaluateAccess({
    authenticated,
    role,
    requiredPermission: permission,
  });
  if (!decision.allowed) {
    return (
      <AccessState
        code={
          decision.reason === "unauthorized" ? "unauthorized" : "forbidden"
        }
        detail={decision.message}
      />
    );
  }
  return <>{children}</>;
}

export function IamRouteGuard({
  authenticated,
  sessionExpired,
  accountLocked,
  role,
  requiredRoles,
  requiredPermission,
  children,
}: {
  readonly authenticated: boolean;
  readonly sessionExpired?: boolean;
  readonly accountLocked?: boolean;
  readonly role?: string | null;
  readonly requiredRoles?: readonly IamRole[];
  readonly requiredPermission?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const decision = evaluateAccess({
    authenticated,
    sessionExpired,
    accountLocked,
    role,
    requiredRoles,
    requiredPermission,
  });
  if (!decision.allowed) {
    const code =
      decision.reason === "account_locked"
        ? "account_locked"
        : decision.reason === "expired_session"
          ? "expired_session"
          : decision.reason === "unauthorized"
            ? "unauthorized"
            : "forbidden";
    return <AccessState code={code} detail={decision.message} />;
  }
  return <>{children}</>;
}
