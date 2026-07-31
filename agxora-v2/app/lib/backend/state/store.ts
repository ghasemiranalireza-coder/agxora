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
import { getActivityFeed } from "../activity";

type Listener = () => void;

export type BackendGlobalState = {
  auth: AuthSession | null;
  user: User | null;
  organization: OrganizationRecord | null;
  workspace: Workspace | null;
  themeMode: ThemeMode | null;
  notifications: Notification[];
  recentActivity: Activity[];
  hydrated: boolean;
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

const state: BackendGlobalState = {
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

function patch(partial: Partial<BackendGlobalState>) {
  Object.assign(state, partial);
  emit();
}

export const backendState = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): BackendGlobalState {
    return {
      ...state,
      recentActivity: [...getActivityFeed()].slice(0, 20),
    };
  },
  setSession(session: AuthSession | null, user: AuthUser | null = null) {
    patch({
      auth: session,
      user: toBackendUser(user),
    });
  },
  setUser(user: AuthUser | null) {
    patch({ user: toBackendUser(user) });
  },
  setOrganization(organization: OrganizationRecord | null) {
    patch({ organization });
  },
  setWorkspace(workspace: Workspace | null) {
    patch({ workspace });
  },
  setThemeMode(themeMode: ThemeMode | null) {
    patch({ themeMode });
  },
  setNotifications(notifications: Notification[]) {
    patch({ notifications });
  },
  markHydrated() {
    patch({ hydrated: true });
  },
  reset() {
    patch({
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
