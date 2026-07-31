"use client";

import { useMemo } from "react";
import { useAuth } from "../auth";
import { useOrganization } from "../organization";
import type { MembershipRole } from "../organization/types";
import { useIsClient } from "../runtime";
import { useTheme } from "../theme";
import { canAccessModule, toIdentityRole } from "./permissions";
import type { ModuleAccessKey } from "./types";

/** Deterministic SSR/hydration defaults — never read navigator during render on the server. */
const SSR_LANGUAGE = "en";
const SSR_TIMEZONE = "UTC";

/**
 * Unified identity view for UI — user, org, workspace, role, permissions.
 */
export function useIdentity() {
  const auth = useAuth();
  const org = useOrganization();
  const { mode, appearance } = useTheme();
  const isClient = useIsClient();

  const language = isClient
    ? navigator.language || SSR_LANGUAGE
    : SSR_LANGUAGE;
  const timezone = isClient
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || SSR_TIMEZONE
    : SSR_TIMEZONE;

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
      timezone,
      language,
      themeMode: mode,
      themeAppearance: appearance,
    },
    switchWorkspace: org.switchWorkspace,
    signOut: auth.signOut,
  };
}
