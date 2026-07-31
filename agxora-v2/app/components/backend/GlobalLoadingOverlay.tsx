"use client";

import type { JSX } from "react";
import { useLoading } from "@/app/lib/backend/hooks";

/**
 * Global loading overlay — architecture host.
 * Always renders a stable DOM shell (SSR/client identical).
 * Never writes store state while rendering.
 */
export function GlobalLoadingOverlay(): JSX.Element {
  const loading = useLoading();
  const active = loading.active;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden"
      role="progressbar"
      aria-busy={active || undefined}
      aria-hidden={!active}
      aria-label={loading.label ?? "Loading"}
      data-active={active ? "true" : "false"}
      style={{ opacity: active ? 1 : 0 }}
    >
      <div className="agxora-global-loading-bar h-full w-1/3" />
    </div>
  );
}
