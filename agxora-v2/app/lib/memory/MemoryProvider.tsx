"use client";

import {
  createContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { MemoryEngine } from "./MemoryEngine";

export const MemoryContext = createContext<MemoryEngine | null>(null);

interface MemoryProviderProps {
  readonly children: ReactNode;
  readonly engine?: MemoryEngine;
}

export function MemoryProvider({
  children,
  engine: injected,
}: MemoryProviderProps): JSX.Element {
  const [engine] = useState(() => injected ?? new MemoryEngine());
  const value = useMemo(() => engine, [engine]);

  return (
    <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>
  );
}
