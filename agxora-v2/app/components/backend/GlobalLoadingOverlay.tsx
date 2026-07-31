"use client";

import type { JSX } from "react";
import { useLoading } from "@/app/lib/backend/hooks";

/**
 * Global loading overlay — architecture host.
 * Invisible when idle; does not redesign module chrome.
 */
export function GlobalLoadingOverlay(): JSX.Element | null {
  const loading = useLoading();
  if (!loading.active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden"
      role="progressbar"
      aria-busy="true"
      aria-label={loading.label ?? "Loading"}
    >
      <div
        className="h-full w-1/3 animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--agx-accent, #22d3ee), transparent)",
          animation: "agxora-loading-slide 1.1s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes agxora-loading-slide {
          0% { transform: translateX(-100%); width: 30%; }
          50% { width: 55%; }
          100% { transform: translateX(350%); width: 30%; }
        }
      `}</style>
    </div>
  );
}
