import type { JSX, ReactNode } from "react";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface MetricDelta {
  /** Formatted delta, e.g. "+12.4%". */
  readonly value: string;
  readonly positive: boolean;
}

export type MetricVisual =
  | { readonly kind: "sparkline"; readonly points: readonly number[] }
  | { readonly kind: "progress"; readonly percent: number }
  | {
      readonly kind: "status";
      readonly items: readonly { readonly label: string; readonly ok: boolean }[];
    };

export interface MetricCardProps {
  readonly title: string;
  readonly value: string;
  readonly caption: string;
  readonly icon: ReactNode;
  readonly delta?: MetricDelta;
  readonly visual?: MetricVisual;
  readonly href?: string;
  readonly actionLabel?: string;
}

/* -------------------------------------------------------------------------- */
/*                              Visual renderers                              */
/* -------------------------------------------------------------------------- */

function Sparkline({ points }: { readonly points: readonly number[] }): JSX.Element {
  const width = 120;
  const height = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - 4 - ((point - min) / span) * (height - 8);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        className="fill-cyan-400/10"
        stroke="none"
      />
      <path
        d={path}
        fill="none"
        className="stroke-cyan-300/80"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: "var(--agx-accent, #67e8f9)" }}
      />
    </svg>
  );
}

function ProgressBar({ percent }: { readonly percent: number }): JSX.Element {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="space-y-1.5">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--agx-divider, rgba(255,255,255,0.06))" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${safe}%`,
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--agx-accent, #22d3ee) 55%, transparent), var(--agx-accent, #67e8f9))",
          }}
        />
      </div>
      <p
        className="text-[11px] tracking-wide tabular-nums"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {safe}% capacity signal
      </p>
    </div>
  );
}

function StatusList({
  items,
}: {
  readonly items: readonly { readonly label: string; readonly ok: boolean }[];
}): JSX.Element {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2 text-[11px] tracking-wide"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: item.ok ? "#34d399" : "#fbbf24",
              boxShadow: item.ok
                ? "0 0 8px rgba(52,211,153,0.55)"
                : "0 0 8px rgba(251,191,36,0.45)",
            }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function MetricVisualRenderer({ visual }: { readonly visual: MetricVisual }): JSX.Element {
  switch (visual.kind) {
    case "sparkline":
      return <Sparkline points={visual.points} />;
    case "progress":
      return <ProgressBar percent={visual.percent} />;
    case "status":
      return <StatusList items={visual.items} />;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Metric card                                */
/* -------------------------------------------------------------------------- */

/**
 * VisionOS-inspired glass metric card.
 * Structure and data unchanged — surface quality only.
 */
export function MetricCard({
  title,
  value,
  caption,
  icon,
  delta,
  visual,
  href,
  actionLabel,
}: MetricCardProps): JSX.Element {
  return (
    <article
      className="agx-metric-card group relative flex h-full min-h-[220px] flex-col gap-5 overflow-hidden rounded-[28px] border p-7"
      style={{
        borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
        background:
          "linear-gradient(165deg, var(--agx-card-bg-from, rgba(255,255,255,0.06)) 0%, var(--agx-card-bg-to, rgba(255,255,255,0.02)) 100%)",
        boxShadow: "var(--agx-card-shadow, 0 8px 32px rgba(0,0,0,0.25))",
        backdropFilter: "var(--agx-card-blur, blur(22px) saturate(150%))",
        WebkitBackdropFilter: "var(--agx-card-blur, blur(22px) saturate(150%))",
        transition:
          "background var(--agx-theme-transition, 820ms) ease, border-color var(--agx-theme-transition, 820ms) ease, box-shadow 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Top specular highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          opacity: 0.7,
        }}
        aria-hidden="true"
      />

      {/* Soft sheen */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-70 transition-opacity duration-400 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-[1.04]"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
              color: "var(--agx-accent, #22d3ee)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            {icon}
          </span>
          <h3
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {title}
          </h3>
        </div>

        {delta !== undefined && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums"
            style={
              delta.positive
                ? {
                    borderColor: "rgba(52,211,153,0.28)",
                    background: "rgba(52,211,153,0.12)",
                    color: "#34d399",
                  }
                : {
                    borderColor: "rgba(251,113,133,0.28)",
                    background: "rgba(251,113,133,0.12)",
                    color: "#fb7185",
                  }
            }
          >
            {delta.value}
          </span>
        )}
      </header>

      <div className="relative">
        <p
          className="text-[1.85rem] font-semibold tabular-nums tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.02em" }}
        >
          {value}
        </p>
        <p
          className="mt-1.5 text-xs tracking-[0.04em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {caption}
        </p>
      </div>

      {visual !== undefined && (
        <footer className="relative mt-auto space-y-3">
          <MetricVisualRenderer visual={visual} />
          {href && actionLabel ? (
            <Link
              href={href}
              className="inline-flex text-xs font-semibold no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                color: "var(--agx-accent, #22d3ee)",
                outlineColor: "var(--agx-accent, #22d3ee)",
              }}
            >
              {actionLabel} →
            </Link>
          ) : null}
        </footer>
      )}
      {visual === undefined && href && actionLabel ? (
        <footer className="relative mt-auto">
          <Link
            href={href}
            className="inline-flex text-xs font-semibold no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              color: "var(--agx-accent, #22d3ee)",
              outlineColor: "var(--agx-accent, #22d3ee)",
            }}
          >
            {actionLabel} →
          </Link>
        </footer>
      ) : null}
    </article>
  );
}

/** Fixed-height skeleton matching MetricCard to prevent layout jump. */
export function MetricCardSkeleton(): JSX.Element {
  return (
    <div
      className="flex min-h-[220px] flex-col gap-5 rounded-[28px] border p-7"
      style={{
        borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
        background:
          "linear-gradient(165deg, var(--agx-card-bg-from, rgba(255,255,255,0.06)) 0%, var(--agx-card-bg-to, rgba(255,255,255,0.02)) 100%)",
      }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="h-3 w-24 rounded"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
      </div>
      <div
        className="h-8 w-20 rounded"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      <div
        className="mt-auto h-9 w-full rounded"
        style={{ background: "rgba(255,255,255,0.04)" }}
      />
    </div>
  );
}
