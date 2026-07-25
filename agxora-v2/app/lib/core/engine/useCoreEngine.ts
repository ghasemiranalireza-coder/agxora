"use client";

import { useContext } from "react";
import { CoreEngineContext } from "./CoreEngineProvider";
import type { CoreEngine } from "./CoreEngine";

export function useCoreEngine(): CoreEngine {
  const engine = useContext(CoreEngineContext);
  if (!engine) {
    throw new Error("useCoreEngine must be used within CoreEngineProvider");
  }
  return engine;
}

export function useOptionalCoreEngine(): CoreEngine | null {
  return useContext(CoreEngineContext);
}
