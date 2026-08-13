/**
 * Settings Profile identity helpers — display only.
 * Server session (/api/v1/auth/me) is the authority for name/email.
 * Workspace role comes from the control-plane actor, never localStorage.
 * Never surfaces the legacy "guest" label as an authenticated role.
 */

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export type ProfileIdentityStatus = "loading" | "signed_out" | "ready";

export type ProfileIdentityView = {
  readonly status: ProfileIdentityStatus;
  readonly displayName: string;
  readonly email: string;
  readonly initials: string;
  readonly role: WorkspaceRole | null;
};

export function profileInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function resolveProfileIdentity(input: {
  readonly hydrated: boolean;
  readonly authenticated: boolean;
  readonly displayName: string | null | undefined;
  readonly email: string | null | undefined;
  readonly workspaceRole: WorkspaceRole | null;
}): ProfileIdentityView {
  if (!input.hydrated) {
    return {
      status: "loading",
      displayName: "",
      email: "",
      initials: "",
      role: null,
    };
  }
  if (!input.authenticated) {
    return {
      status: "signed_out",
      displayName: "",
      email: "",
      initials: "",
      role: null,
    };
  }
  const displayName = input.displayName?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  return {
    status: "ready",
    displayName,
    email,
    initials: profileInitials(displayName),
    role: input.workspaceRole,
  };
}
