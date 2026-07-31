"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  clearAiActiveContext,
  getAiPlatformContext,
  setAiActiveContext,
  subscribeAiPlatformContext,
} from "../context";
import type { AiContextRef, AiPlatformContext } from "../types";

export function useAiPlatformContext(): {
  context: AiPlatformContext;
  setActive: (ref: AiContextRef) => void;
  clear: () => void;
} {
  const context = useSyncExternalStore(
    subscribeAiPlatformContext,
    getAiPlatformContext,
    getAiPlatformContext,
  );

  const setActive = useCallback((ref: AiContextRef) => {
    setAiActiveContext(ref);
  }, []);

  const clear = useCallback(() => {
    clearAiActiveContext();
  }, []);

  return { context, setActive, clear };
}
