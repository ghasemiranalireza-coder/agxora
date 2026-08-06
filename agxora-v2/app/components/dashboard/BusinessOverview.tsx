import type { JSX } from "react";
import {
  MetricCard,
  type MetricCardProps,
} from "./MetricCard";
import { motion, useReducedMotion } from "framer-motion";

interface IconProps {
  readonly path: string;
}

function Icon({ path }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const ICON_PATHS = {
  revenue: "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  clients:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  aiTasks:
    "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  automation:
    "M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83",
  health:
    "M22 12h-4l-3 9L9 3l-3 9H2",
  growth:
    "M3 3v18h18 M7 15l4-6 4 3 5-8",
} as const;

/** Empty overview until live metrics are connected — no fabricated figures. */
const OVERVIEW_METRICS: readonly MetricCardProps[] = [
  {
    title: "Revenue",
    value: "—",
    caption: "Connect billing data to show MRR",
    icon: <Icon path={ICON_PATHS.revenue} />,
    visual: { kind: "sparkline", points: [0, 0, 0, 0, 0, 0, 0, 0] },
  },
  {
    title: "Active Clients",
    value: "0",
    caption: "Customers with active status",
    icon: <Icon path={ICON_PATHS.clients} />,
    visual: { kind: "sparkline", points: [0, 0, 0, 0, 0, 0, 0, 0] },
  },
  {
    title: "AI Tasks",
    value: "0",
    caption: "Completed this month",
    icon: <Icon path={ICON_PATHS.aiTasks} />,
    visual: { kind: "sparkline", points: [0, 0, 0, 0, 0, 0, 0, 0] },
  },
  {
    title: "Automation Status",
    value: "—",
    caption: "No active workflows yet",
    icon: <Icon path={ICON_PATHS.automation} />,
    visual: { kind: "progress", percent: 0 },
  },
  {
    title: "System Health",
    value: "OK",
    caption: "Workspace operational",
    icon: <Icon path={ICON_PATHS.health} />,
    visual: {
      kind: "status",
      items: [
        { label: "Application online", ok: true },
        { label: "Local workspace ready", ok: true },
      ],
    },
  },
  {
    title: "Growth Analytics",
    value: "—",
    caption: "Available when usage accumulates",
    icon: <Icon path={ICON_PATHS.growth} />,
    visual: { kind: "sparkline", points: [0, 0, 0, 0, 0, 0, 0, 0] },
  },
];

/** Premium glassmorphism metric grid rendered below the globe hero. */
export function BusinessOverview(): JSX.Element {
  const reduceMotion = useReducedMotion();

  const cardVariants = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 14 },
        show: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, delay: i * 0.06 },
        }),
      };

  return (
    <section aria-label="Business overview" className="mb-12">
      <header className="mb-7 flex items-baseline justify-between gap-4">
        <div>
          <h2
            className="text-[15px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--agx-accent, #22d3ee)" }}
          >
            Business Overview
          </h2>
          <p
            className="mt-2 text-[13px] tracking-[0.03em]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Workspace metrics for your organization
          </p>
        </div>
        <span
          className="hidden rounded-full border px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.18em] sm:inline-block"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
            background: "var(--agx-card-bg, rgba(255,255,255,0.03))",
            color: "var(--agx-text-muted, #94a3b8)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
            backdropFilter: "var(--agx-card-blur, blur(16px))",
          }}
        >
          LIVE WORKSPACE
        </span>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {OVERVIEW_METRICS.map((metric, index) => {
          if (!cardVariants) return <MetricCard key={metric.title} {...metric} />;

          return (
            <motion.div
              key={metric.title}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              whileHover={reduceMotion ? undefined : { y: -2 }}
              animate="show"
            >
              <MetricCard {...metric} />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
