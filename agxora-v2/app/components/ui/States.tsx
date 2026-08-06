"use client";

import type { JSX, ReactNode } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { UI } from "./tokens";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  footer,
}: {
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly icon?: ReactNode;
  readonly footer?: ReactNode;
}): JSX.Element {
  return (
    <div role="status" aria-live="polite">
      <Card
        hover={false}
        className="flex flex-col items-center text-center"
        padding={`${UI.space["2xl"]}px ${UI.space.lg}px`}
      >
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border"
          style={{
            borderColor: UI.color.border,
            color: UI.color.accent,
            background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 8%, transparent)",
          }}
          aria-hidden="true"
        >
          {icon ?? (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em" }}>
              AGX
            </span>
          )}
        </div>
        <h3
          className="text-base font-semibold"
          style={{ color: UI.color.text }}
        >
          {title}
        </h3>
        <p
          className="mt-2 max-w-md text-sm leading-relaxed"
          style={{ color: UI.color.textMuted }}
        >
          {description}
        </p>
        {actionLabel && onAction ? (
          <div className="mt-5">
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        ) : null}
        {footer ? <div className="mt-5">{footer}</div> : null}
      </Card>
    </div>
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
    <Card hover={false} padding={`${UI.space.lg}px`}>
      <div role="alert">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: UI.color.danger }}
        >
          Error
        </p>
        <h3
          className="mt-2 text-base font-semibold"
          style={{ color: UI.color.text }}
        >
          {title}
        </h3>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: UI.color.textMuted }}
        >
          {description}
        </p>
        {onRetry ? (
          <div className="mt-4">
            <Button variant="primary" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function SuccessState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}): JSX.Element {
  return (
    <Card
      hover={false}
      className="flex flex-col items-center text-center"
      padding={`${UI.space.xl}px ${UI.space.lg}px`}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border"
        style={{
          borderColor: "color-mix(in srgb, var(--agx-ds-success) 35%, transparent)",
          color: UI.color.success,
          background: "color-mix(in srgb, var(--agx-ds-success) 10%, transparent)",
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>✓</span>
      </div>
      <h3 className="text-base font-semibold" style={{ color: UI.color.text }}>
        {title}
      </h3>
      <p
        className="mt-2 max-w-md text-sm leading-relaxed"
        style={{ color: UI.color.textMuted }}
      >
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
        borderRadius: UI.radius.sm,
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
