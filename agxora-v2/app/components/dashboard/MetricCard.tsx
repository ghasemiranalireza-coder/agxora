import type { JSX, ReactNode } from "react";

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
      />
    </svg>
  );
}

function ProgressBar({ percent }: { readonly percent: number }): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-cyan-300/90 transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[11px] tracking-wide text-slate-400">
        {percent}% of workflows automated
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
          className="flex items-center gap-2 text-[11px] tracking-wide text-slate-400"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              item.ok ? "bg-emerald-400" : "bg-amber-400"
            }`}
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
 * Reusable glassmorphism metric card for enterprise dashboards.
 * Pure presentational server component — hover states are CSS-only.
 */
export function MetricCard({
  title,
  value,
  caption,
  icon,
  delta,
  visual,
}: MetricCardProps): JSX.Element {
  return (
    <article
      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-cyan-300/25 hover:from-white/[0.09] hover:to-white/[0.03] hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
    >
      {/* Soft sheen that brightens on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.05] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-cyan-300 transition-colors duration-300 group-hover:border-cyan-300/30 group-hover:text-cyan-200">
            {icon}
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </h3>
        </div>

        {delta !== undefined && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
              delta.positive
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-400/10 text-rose-300"
            }`}
          >
            {delta.value}
          </span>
        )}
      </header>

      <div>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-50">
          {value}
        </p>
        <p className="mt-1 text-xs tracking-wide text-slate-400">{caption}</p>
      </div>

      {visual !== undefined && (
        <footer className="mt-auto">
          <MetricVisualRenderer visual={visual} />
        </footer>
      )}
    </article>
  );
}
