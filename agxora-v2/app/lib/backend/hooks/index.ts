"use client";

import { useSyncExternalStore } from "react";
import { backendState, type BackendGlobalState } from "../state";
import { toastStore, type ToastItem } from "../notifications";
import { loadingStore, type LoadingSnapshot } from "../loading";
import { getActivityFeed, subscribeActivity } from "../activity";
import type { Activity } from "../types";
import { getApiClient } from "../api";
import { backendServices } from "../services";
import { backendConfig } from "../config";
import {
  assertAccess,
  checkPermission,
  routeGuard,
  type GuardResult,
  type RoleLike,
} from "../security";
import type { ModuleAccessKey } from "@/app/lib/identity/types";

export function useBackendState(): BackendGlobalState {
  return useSyncExternalStore(
    backendState.subscribe,
    backendState.getSnapshot,
    backendState.getSnapshot,
  );
}

export function useAuthState() {
  const state = useBackendState();
  return {
    session: state.auth,
    user: state.user,
    hydrated: state.hydrated,
    isAuthenticated: Boolean(state.auth),
  };
}

export function useOrganizationState() {
  const state = useBackendState();
  return {
    organization: state.organization,
    workspace: state.workspace,
  };
}

export function useNotificationState() {
  const state = useBackendState();
  return state.notifications;
}

export function useThemeState() {
  const state = useBackendState();
  return state.themeMode;
}

export function useRecentActivity(): readonly Activity[] {
  return useSyncExternalStore(
    subscribeActivity,
    () => getActivityFeed(),
    () => getActivityFeed(),
  );
}

export function useToasts(): readonly ToastItem[] {
  return useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getSnapshot,
  );
}

export function useToast() {
  return {
    success: toastStore.success,
    warning: toastStore.warning,
    error: toastStore.error,
    info: toastStore.info,
    dismiss: toastStore.dismiss,
    clear: toastStore.clear,
  };
}

export function useLoading(): LoadingSnapshot {
  return useSyncExternalStore(
    loadingStore.subscribe,
    loadingStore.getSnapshot,
    loadingStore.getSnapshot,
  );
}

export function useLoadingActions() {
  return {
    start: loadingStore.start,
    stop: loadingStore.stop,
    reset: loadingStore.reset,
  };
}

export function useBackend() {
  return {
    config: backendConfig,
    api: getApiClient(),
    services: backendServices,
    state: backendState,
  };
}

export function useAccessGuard(input: {
  authenticated: boolean;
  role?: RoleLike;
  module?: ModuleAccessKey;
  pathname?: string;
}): GuardResult {
  return assertAccess(input);
}

export function useCanAccess(
  role: RoleLike,
  module: ModuleAccessKey,
): boolean {
  return checkPermission(role, module);
}

export function useRouteAllowed(pathname: string, role: RoleLike): boolean {
  return routeGuard(pathname, role);
}
