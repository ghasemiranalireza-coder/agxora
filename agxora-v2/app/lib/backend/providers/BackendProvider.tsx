"use client";

import {
  useEffect,
  type JSX,
  type ReactNode,
} from "react";
import { useAuth } from "@/app/lib/auth";
import { useOrganization } from "@/app/lib/organization";
import { useTheme } from "@/app/lib/theme";
import { backendState } from "../state";
import { asOrganizationId, asUserId } from "@/app/lib/organization/types";

/**
 * Bridges existing Auth / Organization / Theme providers into backendState.
 * No visual changes — state sync only.
 */
export function BackendStateBridge({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const auth = useAuth();
  const org = useOrganization();
  const theme = useTheme();

  useEffect(() => {
    backendState.setSession(auth.session, auth.user);
    if (auth.hydrated) backendState.markHydrated();
  }, [auth.session, auth.user, auth.hydrated]);

  useEffect(() => {
    const active = org.organization;
    if (!active) {
      backendState.setOrganization(null);
      backendState.setWorkspace(null);
      return;
    }
    backendState.setOrganization({
      id: asOrganizationId(active.id),
      name: active.name,
      slug: active.slug,
      ownerUserId: asUserId(active.ownerId),
      createdAt: active.createdAt,
      updatedAt: active.updatedAt,
    });
    const ws = org.workspace;
    if (ws) {
      backendState.setWorkspace({
        id: ws.id,
        organizationId: active.id,
        name: ws.name,
        status: ws.status,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      });
    } else {
      backendState.setWorkspace(null);
    }
  }, [org.organization, org.workspace]);

  useEffect(() => {
    backendState.setThemeMode(theme.mode);
  }, [theme.mode]);

  return <>{children}</>;
}
