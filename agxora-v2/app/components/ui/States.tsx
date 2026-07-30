"use client";

import type { JSX, ReactNode } from "react";
import { Button } from "./Button";
import { Card } from "./Card";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly icon?: ReactNode;
}): JSX.Element {
  return (
    <Card hover={false} className="flex flex-col items-center text-center" padding="40px 28px">
      {icon ? (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
            color: "var(--agx-accent, #22d3ee)",
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {description}
      </p>
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn’t complete that request. Try again in a moment.",
  onRetry,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
}): JSX.Element {
  return (
    <Card hover={false} padding="28px">
      <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {description}
      </p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="primary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function Skeleton({
  className = "",
  height = 16,
  width = "100%",
}: {
  readonly className?: string;
  readonly height?: number | string;
  readonly width?: number | string;
}): JSX.Element {
  return (
    <div
      className={`agx-ui-skeleton ${className}`}
      style={{
        height,
        width,
        borderRadius: 10,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
        backgroundSize: "200% 100%",
        animation: "agx-ui-skeleton-shimmer 1.2s ease-in-out infinite",
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard(): JSX.Element {
  return (
    <Card hover={false} className="space-y-3">
      <Skeleton height={12} width="40%" />
      <Skeleton height={28} width="55%" />
      <Skeleton height={12} width="70%" />
    </Card>
  );
}
