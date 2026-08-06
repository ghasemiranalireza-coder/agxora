import type { JSX } from "react";
import { MetricCardSkeleton } from "../components/dashboard/MetricCard";
import { Skeleton } from "../components/ui";

/** App Router loading UI — matches dashboard structure to avoid layout jump. */
export default function DashboardLoading(): JSX.Element {
  return (
    <div
      className="mx-auto w-full max-w-[1180px] space-y-8 px-1 py-2"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-3">
        <Skeleton height={12} width="28%" />
        <Skeleton height={48} width="55%" />
        <Skeleton height={16} width="70%" />
        <div className="flex gap-3 pt-2">
          <Skeleton height={44} width={140} />
          <Skeleton height={44} width={140} />
        </div>
      </div>

      <div className="space-y-3 rounded-[26px] border p-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Skeleton height={12} width="22%" />
        <Skeleton height={14} width="60%" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton height={84} />
          <Skeleton height={84} />
          <Skeleton height={84} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <p className="sr-only">Loading dashboard…</p>
    </div>
  );
}
