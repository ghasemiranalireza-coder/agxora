"use client";

import { useSyncExternalStore } from "react";
import { iamAuditStore } from "../store/auditStore";
import { iamSessionManager } from "../store/sessionManager";
import { iamProfileStore } from "../store/profileStore";
import type { IamAuditEvent, IamProfilePreferences, IamSessionPolicy } from "../types";

export function useIamAuditEvents(): readonly IamAuditEvent[] {
  return useSyncExternalStore(
    (l) => iamAuditStore.subscribe(l),
    () => iamAuditStore.list(),
    () => [],
  );
}

export function useIamSession() {
  return useSyncExternalStore(
    (l) => iamSessionManager.subscribe(l),
    () => iamSessionManager.getSnapshot(),
    () => iamSessionManager.getSnapshot(),
  );
}

export function useIamSessionPolicy(): IamSessionPolicy {
  return useSyncExternalStore(
    (l) => iamSessionManager.subscribe(l),
    () => iamSessionManager.getPolicy(),
    () => iamSessionManager.getPolicy(),
  );
}

export function useIamProfilePreferences(): IamProfilePreferences {
  return useSyncExternalStore(
    (l) => iamProfileStore.subscribe(l),
    () => iamProfileStore.get(),
    () => iamProfileStore.get(),
  );
}
