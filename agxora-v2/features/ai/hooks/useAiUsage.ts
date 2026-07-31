"use client";

import { useSyncExternalStore } from "react";
import { aiUsageTracker } from "../store/usageTracker";
import type { AiUsageSnapshot } from "../types";

export function useAiUsage(): AiUsageSnapshot {
  return useSyncExternalStore(
    (listener) => aiUsageTracker.subscribe(listener),
    () => aiUsageTracker.snapshot(),
    () => aiUsageTracker.snapshot(),
  );
}
