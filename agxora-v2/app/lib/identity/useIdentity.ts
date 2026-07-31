"use client";

import { useMemo } from "react";
import { useAuth } from "../auth";
import { useOrganization } from "../organization";
import type { MembershipRole } from "../organization/types";
import { useTheme } from "../theme";
import { canAccessModule, toIdentityRole } from "./permissions";
import type { ModuleAccessKey } from "./types";

/**
 * Unified identity view for UI — user, org, workspace, role, permissions.
 */
export function useIdentity() {
  const auth = useAuth();
  const org = useOrganization();
  const { mode, appearance } = useTheme();

  const membership = useMemo(() => {
    if (!auth.user || !org.workspace) return null;
    return (
      org.session.memberships.find(
        (m) => m.userId === auth.user?.id && m.workspaceId === org.workspace?.id,
      ) ?? org.session.memberships.find((m) => m.userId === auth.user?.id) ?? null
    );
  }, [auth.user, org.session.memberships, org.workspace]);

  const role: MembershipRole | null = membership?.role ?? null;

  return {
    user: auth.user,
    session: auth.session,
    isAuthenticated: auth.isAuthenticated,
    hydrated: auth.hydrated,
    organization: org.organization,
    workspace: org.workspace,
    accessibleWorkspaces: org.session.accessibleWorkspaces,
    membership,
    role,
    identityRole: role ? toIdentityRole(role) : null,
    can: (module: ModuleAccessKey) => canAccessModule(role, module),
    profile: {
      fullName: auth.user?.displayName ?? "Guest",
      email: auth.user?.email ?? "",
      avatarInitials: (auth.user?.displayName ?? "G")
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      roleLabel: role ?? "guest",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: typeof navigator !== "undefined" ? navigator.language : "en",
      themeMode: mode,
      themeAppearance: appearance,
    },
    switchWorkspace: org.switchWorkspace,
    signOut: auth.signOut,
  };
}
