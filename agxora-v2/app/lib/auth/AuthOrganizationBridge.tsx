"use client";

/**
 * Bridges Auth → OrganizationService current user resolver.
 */

import { useEffect, type JSX, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { asUserId } from "../organization/types";
import { organizationService } from "../organization/organizationService";

export function AuthOrganizationBridge({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const { userId, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    organizationService.setCurrentUserResolver(() =>
      userId ? userId : asUserId("user_local_anonymous"),
    );
  }, [hydrated, userId]);

  return <>{children}</>;
}
