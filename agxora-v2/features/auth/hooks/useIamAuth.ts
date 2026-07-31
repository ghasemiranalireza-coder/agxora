"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/app/lib/auth";
import { useIdentity } from "@/app/lib/identity";
import {
  canAccessWithPermission,
  canAccessWithRole,
  normalizeIamRole,
} from "../guards";
import type { IamRole } from "../types";
import { iamAuthService } from "../services/iamAuthService";

export function useIamAuth() {
  const auth = useAuth();
  const identity = useIdentity();

  const role = useMemo(
    () => normalizeIamRole(identity.role ?? identity.membership?.role ?? null),
    [identity.membership?.role, identity.role],
  );

  const can = useCallback(
    (permissionId: string) => canAccessWithPermission(role, permissionId),
    [role],
  );

  const hasRole = useCallback(
    (allowed: readonly IamRole[]) => canAccessWithRole(role, allowed),
    [role],
  );

  return {
    ...auth,
    identity,
    role,
    can,
    hasRole,
    login: iamAuthService.login,
    logout: iamAuthService.logout,
    register: iamAuthService.register,
  };
}
