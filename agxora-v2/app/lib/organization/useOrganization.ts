"use client";

/**
 * Public hooks for the Universal Organization Foundation.
 */

import { useMemo } from "react";
import {
  useOrganizationContext,
  type OrganizationContextValue,
} from "./OrganizationProvider";
import type {
  Organization,
  OrganizationAiContext,
  Workspace,
} from "./types";

/** Full organization foundation API for consumers. */
export function useOrganization(): OrganizationContextValue {
  return useOrganizationContext();
}

/** Active organization only — stable reference when unchanged. */
export function useActiveOrganization(): Organization | null {
  return useOrganizationContext().organization;
}

/** Active workspace only. */
export function useActiveWorkspace(): Workspace | null {
  return useOrganizationContext().workspace;
}

/**
 * AI foundation context. Safe for future agents / copilots.
 * Returns null until an organization + workspace are active.
 */
export function useOrganizationAiContext(): OrganizationAiContext | null {
  return useOrganizationContext().aiContext;
}

/** Multi-workspace readiness helpers without UI. */
export function useWorkspaceDirectory(): {
  readonly workspaces: readonly Workspace[];
  readonly activeWorkspaceId: string | null;
  readonly switchWorkspace: OrganizationContextValue["switchWorkspace"];
} {
  const { session, workspace, switchWorkspace } = useOrganizationContext();
  return useMemo(
    () => ({
      workspaces: session.accessibleWorkspaces,
      activeWorkspaceId: workspace?.id ?? null,
      switchWorkspace,
    }),
    [session.accessibleWorkspaces, workspace?.id, switchWorkspace],
  );
}
