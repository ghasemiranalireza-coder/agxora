"use client";

import type { JSX } from "react";
import { Card, Skeleton } from "@/app/components/ui";

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
          height={index === 0 ? 28 : 14}
          width={index === 0 ? "42%" : index === lines - 1 ? "58%" : "100%"}
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
    <div className="agx-page-enter space-y-4 py-2" aria-busy="true" aria-live="polite">
      <p
        className="text-xs font-semibold uppercase tracking-[0.16em]"
        style={{ color: "var(--agx-ds-text-muted, #94a3b8)" }}
      >
        {label}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card hover={false} padding="24px">
          <SkeletonBlock lines={3} label={label} />
        </Card>
        <Card hover={false} padding="24px">
          <SkeletonBlock lines={4} label={label} />
        </Card>
      </div>
      <Card hover={false} padding="24px">
        <SkeletonBlock lines={5} label={label} />
      </Card>
    </div>
  );
}
