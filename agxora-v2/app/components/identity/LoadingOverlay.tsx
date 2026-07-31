"use client";

import type { JSX } from "react";
import { Skeleton } from "../ui";

export function IdentityLoadingOverlay({
  label = "Loading identity…",
}: {
  readonly label?: string;
}): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: "rgba(2,6,23,0.45)" }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="w-full max-w-sm space-y-3 rounded-2xl border p-6"
        style={{
          borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
          background: "rgba(10,16,28,0.95)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {label}
        </p>
        <Skeleton height={14} width="70%" />
        <Skeleton height={36} width="100%" />
        <Skeleton height={36} width="100%" />
      </div>
    </div>
  );
}
