"use client";

import { useEffect, useState } from "react";

/**
 * False during SSR and the hydration render (matches server HTML).
 * Flips true after mount — safe place to read navigator/localStorage/Date.
 */
export function useIsClient(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  return mounted;
}
