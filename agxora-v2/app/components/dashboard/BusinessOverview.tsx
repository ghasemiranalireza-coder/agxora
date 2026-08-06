"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useOrganization } from "../../lib/organization";
import { customerStore, useCustomerStore } from "../../lib/customers";
import { projectStore, useProjectStore } from "../../lib/projects";
import { useRecentActivity } from "../../lib/backend/hooks";
import {
  MetricCard,
  MetricCardSkeleton,
  type MetricCardProps,
} from "./MetricCard";

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
  projects: "M3 7h18 M3 12h18 M3 17h12",
  activity:
    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  health:
    "M22 12h-4l-3 9L9 3l-3 9H2",
  growth:
    "M3 3v18h18 M7 15l4-6 4 3 5-8",
} as const;

const LOCAL_ORG_FALLBACK = "org_local_default";

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}

/** Premium metric grid — live workspace counts, stable skeletons while hydrating. */
export function BusinessOverview(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? LOCAL_ORG_FALLBACK;
  const customers = useCustomerStore();
  const projects = useProjectStore();
  const activity = useRecentActivity();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.all([
        customerStore.hydrate(organizationId),
        projectStore.hydrate(organizationId),
      ]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const activeCustomers = useMemo(
    () => customers.items.filter((row) => row.status === "active").length,
    [customers.items],
  );
  const projectCount = projects.items.length;
  const todayActivity = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return activity.filter((row) => new Date(row.createdAt) >= start).length;
  }, [activity]);

  const metrics: readonly MetricCardProps[] = useMemo(
    () => [
      {
        title: "Active clients",
        value: formatCount(activeCustomers),
        caption:
          activeCustomers === 0
            ? "No active customers yet"
            : `${formatCount(customers.items.length)} total in workspace`,
        icon: <Icon path={ICON_PATHS.clients} />,
        href: "/dashboard/customers",
        actionLabel: activeCustomers === 0 ? "Add customer" : "View customers",
        visual: {
          kind: "sparkline",
          points:
            activeCustomers === 0
              ? [0, 0, 0, 0, 0, 0, 0, 0]
              : [1, 1, 2, 2, 3, 3, Math.max(3, activeCustomers - 1), activeCustomers],
        },
      },
      {
        title: "Projects",
        value: formatCount(projectCount),
        caption:
          projectCount === 0
            ? "No projects in portfolio"
            : "Open delivery tracks",
        icon: <Icon path={ICON_PATHS.projects} />,
        href: "/dashboard/projects",
        actionLabel: projectCount === 0 ? "Create project" : "Open projects",
        visual: {
          kind: "progress",
          percent: projectCount === 0 ? 0 : Math.min(100, projectCount * 12),
        },
      },
      {
        title: "Activity today",
        value: formatCount(todayActivity),
        caption:
          todayActivity === 0
            ? "Nothing logged yet today"
            : "Workspace events since midnight",
        icon: <Icon path={ICON_PATHS.activity} />,
        href: "#agx-live-activity",
        actionLabel: "View feed",
        visual: {
          kind: "sparkline",
          points:
            todayActivity === 0
              ? [0, 0, 0, 0, 0, 0, 0, 0]
              : [0, 1, 1, 2, 2, 3, Math.max(1, todayActivity - 1), todayActivity],
        },
      },
      {
        title: "Revenue",
        value: "—",
        caption: "Connect billing to show MRR",
        icon: <Icon path={ICON_PATHS.revenue} />,
        href: "/dashboard/billing",
        actionLabel: "Open billing",
        visual: { kind: "sparkline", points: [0, 0, 0, 0, 0, 0, 0, 0] },
      },
      {
        title: "System health",
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
        title: "Growth",
        value: "—",
        caption: "Available when usage accumulates",
        icon: <Icon path={ICON_PATHS.growth} />,
        href: "/dashboard/analytics",
        actionLabel: "Open analytics",
        visual: { kind: "sparkline", points: [0, 0, 0, 0, 0, 0, 0, 0] },
      },
    ],
    [activeCustomers, customers.items.length, projectCount, todayActivity],
  );

  const cardVariants = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 14 },
        show: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, delay: i * 0.05 },
        }),
      };

  return (
    <section aria-label="Business overview" className="agx-dash-panel mb-10">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h2
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--agx-accent, #22d3ee)" }}
          >
            What is happening
          </h2>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Live workspace metrics for {organization?.name ?? "your organization"}
          </p>
        </div>
        <span
          className="hidden rounded-full border px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.18em] sm:inline-block"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
            background: "var(--agx-card-bg, rgba(255,255,255,0.03))",
            color: "var(--agx-text-muted, #94a3b8)",
          }}
        >
          LIVE
        </span>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {!ready
          ? Array.from({ length: 6 }, (_, index) => (
              <MetricCardSkeleton key={`sk-${index}`} />
            ))
          : metrics.map((metric, index) => {
              if (!cardVariants) {
                return (
                  <div key={metric.title} className="h-full">
                    <MetricCard {...metric} />
                  </div>
                );
              }
              return (
                <motion.div
                  key={metric.title}
                  className="h-full"
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
