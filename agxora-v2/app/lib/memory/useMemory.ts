"use client";

import { useContext } from "react";
import { MemoryEngine } from "./MemoryEngine";
import { MemoryContext } from "./MemoryProvider";

export function useMemory(): MemoryEngine {
  const engine = useContext(MemoryContext);
  if (!engine) {
    throw new Error("useMemory must be used within MemoryProvider");
  }
  return engine;
}

export function useOptionalMemory(): MemoryEngine | null {
  return useContext(MemoryContext);
}
