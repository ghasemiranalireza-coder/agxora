"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { getPlatformConfig } from "@/app/lib/backend/config/featureFlags";
import {
  getActiveDataProvider,
  type DataProviderHealth,
} from "@/app/lib/backend/providers/data";
import { domainRepositories } from "@/app/lib/backend/repositories/domain";
import { serverStateStore } from "@/app/lib/backend/state/slices";

export function useDataPlatformStatus() {
  const server = useSyncExternalStore(
    (l) => serverStateStore.subscribe(l),
    () => serverStateStore.get(),
    () => serverStateStore.get(),
  );
  const config = getPlatformConfig();
  const [health, setHealth] = useState<DataProviderHealth | null>(null);

  const refreshHealth = useCallback(async () => {
    const next = await getActiveDataProvider().health();
    setHealth(next);
    return next;
  }, []);

  return {
    server,
    config,
    health,
    refreshHealth,
    repositories: domainRepositories,
  };
}
