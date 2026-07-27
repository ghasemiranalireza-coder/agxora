/**
 * Lightweight organization session store.
 *
 * Keeps a single source of truth outside React so services and
 * non-React modules can read session state without prop drilling.
 * React subscribers use useSyncExternalStore via OrganizationProvider.
 */

import type {
  Organization,
  OrganizationAiContext,
  OrganizationSession,
  Workspace,
  WorkspaceId,
  WorkspaceMembership,
} from "./types";

type Listener = () => void;

const listeners = new Set<Listener>();

let session: OrganizationSession = {
  organization: null,
  workspace: null,
  accessibleWorkspaces: [],
  memberships: [],
  status: "idle",
  error: null,
  hydrated: false,
};

let aiContext: OrganizationAiContext | null = null;

export function getOrganizationSession(): OrganizationSession {
  return session;
}

export function getOrganizationAiContext(): OrganizationAiContext | null {
  return aiContext;
}

export function setOrganizationSession(next: OrganizationSession): void {
  session = next;
  listeners.forEach((listener) => listener());
}

export function patchOrganizationSession(
  patch: Partial<OrganizationSession>,
): void {
  session = { ...session, ...patch };
  listeners.forEach((listener) => listener());
}

export function setActiveOrganization(organization: Organization | null): void {
  session = { ...session, organization };
  listeners.forEach((listener) => listener());
}

export function setActiveWorkspace(workspace: Workspace | null): void {
  session = { ...session, workspace };
  listeners.forEach((listener) => listener());
}

export function setAccessibleWorkspaces(
  workspaces: readonly Workspace[],
): void {
  session = { ...session, accessibleWorkspaces: workspaces };
  listeners.forEach((listener) => listener());
}

export function setMemberships(
  memberships: readonly WorkspaceMembership[],
): void {
  session = { ...session, memberships };
  listeners.forEach((listener) => listener());
}

export function setOrganizationAiContext(
  context: OrganizationAiContext | null,
): void {
  aiContext = context;
  listeners.forEach((listener) => listener());
}

/**
 * Multi-workspace readiness: switch active workspace if accessible.
 * UI for switching is intentionally not built in Phase 3.
 */
export function selectWorkspaceInStore(
  workspaceId: WorkspaceId,
): Workspace | null {
  const next = session.accessibleWorkspaces.find((ws) => ws.id === workspaceId);
  if (!next) return null;
  session = { ...session, workspace: next };
  listeners.forEach((listener) => listener());
  return next;
}

export function subscribeOrganizationStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetOrganizationStore(): void {
  session = {
    organization: null,
    workspace: null,
    accessibleWorkspaces: [],
    memberships: [],
    status: "idle",
    error: null,
    hydrated: false,
  };
  aiContext = null;
  listeners.forEach((listener) => listener());
}
