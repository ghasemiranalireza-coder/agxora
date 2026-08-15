"use client";

import { useSyncExternalStore } from "react";
import { aiUsageTracker } from "../store/usageTracker";
import type { AiUsageSnapshot } from "../types";

function subscribe(listener: () => void): () => void {
  return aiUsageTracker.subscribe(listener);
}

function getSnapshot(): AiUsageSnapshot {
  return aiUsageTracker.snapshot();
}

export function useAiUsage(): AiUsageSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
