"use client";

/**
 * DataPlatformBridge — boots providers, API auth hooks, local handlers.
 * Does not alter dashboard shell UI.
 */

import { useEffect, type JSX, type ReactNode } from "react";
import { useOptionalAuth } from "@/app/lib/auth";
import { configureApiClient, getApiClient } from "../api/client";
import { getPlatformConfig } from "../config/featureFlags";
import { setActiveDataProvider } from "./data";
import { registerLocalDataHandlers } from "./data/registerLocalHandlers";
import { serverStateStore } from "../state/slices";
import {
  getCsrfToken,
  readTokenBundle,
} from "../security/secureStorage";
import { logPlatformEvent, markPerformance } from "../observability";

let bootstrapped = false;

function bootstrapOnce(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  registerLocalDataHandlers();
  const config = getPlatformConfig();
  setActiveDataProvider(config.dataProvider);
  markPerformance("data-platform-boot");
  logPlatformEvent("perf.mark", { name: "data-platform-boot" });
}

export function DataPlatformBridge({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const auth = useOptionalAuth();

  useEffect(() => {
    bootstrapOnce();
    configureApiClient(() => auth?.session?.accessToken ?? null);

    void (async () => {
      await readTokenBundle();
      const csrf = getCsrfToken();
      if (csrf) {
        getApiClient().setCsrfToken(csrf);
      }
      serverStateStore.patch({
        hydrated: true,
        lastSyncedAt: new Date().toISOString(),
        online: typeof navigator === "undefined" ? true : navigator.onLine,
      });
    })();

    const onOnline = () => serverStateStore.patch({ online: true });
    const onOffline = () => serverStateStore.patch({ online: false });
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      }
    };
  }, [auth?.session?.accessToken]);

  return <>{children}</>;
}
