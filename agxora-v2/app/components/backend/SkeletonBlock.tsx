"use client";

import type { JSX } from "react";
import { Skeleton } from "@/app/components/ui";

/** Reusable skeleton blocks for async module surfaces. */
export function SkeletonBlock({
  lines = 3,
  label,
}: {
  readonly lines?: number;
  readonly label?: string;
}): JSX.Element {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label ?? "Loading"}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={`sk-${index}`}
          height={index === 0 ? 28 : 16}
          width={index === lines - 1 ? "66%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonPanel({
  label = "Loading…",
}: {
  readonly label?: string;
}): JSX.Element {
  return (
    <div className="space-y-4 py-2">
      <p
        className="text-xs uppercase tracking-[0.14em]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </p>
      <SkeletonBlock lines={4} label={label} />
    </div>
  );
}
