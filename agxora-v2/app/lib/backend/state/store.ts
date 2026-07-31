"use client";

import type { AuthSession, AuthUser } from "@/app/lib/auth/types";
import type { OrganizationRecord } from "@/app/lib/identity/types";
import type { ThemeMode } from "@/app/lib/theme";
import type {
  Activity,
  Notification,
  User,
  Workspace,
} from "../types/models";
import { getActivityFeed, subscribeActivity } from "../activity";

type Listener = () => void;

export type BackendGlobalState = {
  readonly auth: AuthSession | null;
  readonly user: User | null;
  readonly organization: OrganizationRecord | null;
  readonly workspace: Workspace | null;
  readonly themeMode: ThemeMode | null;
  readonly notifications: Notification[];
  readonly recentActivity: Activity[];
  readonly hydrated: boolean;
};

function toBackendUser(user: AuthUser | null): User | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    organizationId: user.defaultOrganizationId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function sameUser(a: User | null, b: User | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.displayName === b.displayName &&
    a.avatarUrl === b.avatarUrl &&
    a.emailVerified === b.emailVerified &&
    a.organizationId === b.organizationId &&
    a.updatedAt === b.updatedAt
  );
}

function sameOrganization(
  a: OrganizationRecord | null,
  b: OrganizationRecord | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.slug === b.slug &&
    a.ownerUserId === b.ownerUserId &&
    a.updatedAt === b.updatedAt
  );
}

function sameWorkspace(a: Workspace | null, b: Workspace | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.organizationId === b.organizationId &&
    a.name === b.name &&
    a.status === b.status &&
    a.updatedAt === b.updatedAt
  );
}

function sameActivityList(a: readonly Activity[], b: readonly Activity[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id || a[i]?.updatedAt !== b[i]?.updatedAt) {
      return false;
    }
  }
  return true;
}

/** Cached snapshot — referential equality until a real change commits. */
let snapshot: BackendGlobalState = {
  auth: null,
  user: null,
  organization: null,
  workspace: null,
  themeMode: null,
  notifications: [],
  recentActivity: [],
  hydrated: false,
};

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: BackendGlobalState): void {
  if (next === snapshot) return;
  snapshot = next;
  emit();
}

function patch(partial: Partial<BackendGlobalState>): void {
  let changed = false;
  for (const key of Object.keys(partial) as (keyof BackendGlobalState)[]) {
    if (partial[key] !== snapshot[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  commit({ ...snapshot, ...partial });
}

function syncRecentActivity(): void {
  const next = getActivityFeed().slice(0, 20);
  if (sameActivityList(snapshot.recentActivity, next)) return;
  patch({ recentActivity: next });
}

// Keep recentActivity in sync without rebuilding snapshots in getSnapshot.
subscribeActivity(syncRecentActivity);

export const backendState = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): BackendGlobalState {
    return snapshot;
  },
  setSession(session: AuthSession | null, user: AuthUser | null = null) {
    const nextUser = toBackendUser(user);
    if (snapshot.auth === session && sameUser(snapshot.user, nextUser)) {
      return;
    }
    patch({
      auth: session,
      user: nextUser,
    });
  },
  setUser(user: AuthUser | null) {
    const nextUser = toBackendUser(user);
    if (sameUser(snapshot.user, nextUser)) return;
    patch({ user: nextUser });
  },
  setOrganization(organization: OrganizationRecord | null) {
    if (sameOrganization(snapshot.organization, organization)) return;
    patch({ organization });
  },
  setWorkspace(workspace: Workspace | null) {
    if (sameWorkspace(snapshot.workspace, workspace)) return;
    patch({ workspace });
  },
  setThemeMode(themeMode: ThemeMode | null) {
    if (snapshot.themeMode === themeMode) return;
    patch({ themeMode });
  },
  setNotifications(notifications: Notification[]) {
    if (snapshot.notifications === notifications) return;
    patch({ notifications });
  },
  markHydrated() {
    if (snapshot.hydrated) return;
    patch({ hydrated: true });
  },
  reset() {
    commit({
      auth: null,
      user: null,
      organization: null,
      workspace: null,
      themeMode: null,
      notifications: [],
      recentActivity: [],
      hydrated: false,
    });
  },
};
