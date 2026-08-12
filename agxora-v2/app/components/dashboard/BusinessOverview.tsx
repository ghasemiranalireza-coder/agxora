"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatNumber, useLocale } from "../../lib/i18n";
import { useOrganization } from "../../lib/organization";
import { customerStore, useCustomerStore } from "../../lib/customers";
import { projectStore, useProjectStore } from "../../lib/projects";
import { useRecentActivity } from "../../lib/backend/hooks";
import {
  MetricCard,
  MetricCardSkeleton,
  type MetricCardProps,
} from "./MetricCard";
import {
  framerTransition,
  MOTION_STANDARD_S,
} from "./motion";

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

/** Premium metric grid — live workspace counts, stable skeletons while hydrating. */
export function BusinessOverview(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t, locale } = useLocale();
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
        title: t("dashboard.overview.activeClients.title"),
        value: formatNumber(activeCustomers, locale),
        caption:
          activeCustomers === 0
            ? t("dashboard.overview.activeClients.captionEmpty")
            : t("dashboard.overview.activeClients.captionTotal", {
                count: formatNumber(customers.items.length, locale),
              }),
        icon: <Icon path={ICON_PATHS.clients} />,
        href: "/dashboard/customers",
        actionLabel:
          activeCustomers === 0
            ? t("dashboard.overview.activeClients.add")
            : t("dashboard.overview.activeClients.view"),
      },
      {
        title: t("dashboard.overview.projects.title"),
        value: formatNumber(projectCount, locale),
        caption:
          projectCount === 0
            ? t("dashboard.overview.projects.captionEmpty")
            : t("dashboard.overview.projects.captionOpen"),
        icon: <Icon path={ICON_PATHS.projects} />,
        href: "/dashboard/projects",
        actionLabel:
          projectCount === 0
            ? t("dashboard.overview.projects.create")
            : t("dashboard.overview.projects.open"),
      },
      {
        title: t("dashboard.overview.activityToday.title"),
        value: formatNumber(todayActivity, locale),
        caption:
          todayActivity === 0
            ? t("dashboard.overview.activityToday.captionEmpty")
            : t("dashboard.overview.activityToday.captionEvents"),
        icon: <Icon path={ICON_PATHS.activity} />,
        href: "#agx-live-activity",
        actionLabel: t("dashboard.overview.activityToday.viewFeed"),
      },
      {
        title: t("dashboard.overview.revenue.title"),
        value: t("dashboard.overview.emDash"),
        caption: t("dashboard.overview.revenue.caption"),
        icon: <Icon path={ICON_PATHS.revenue} />,
        href: "/dashboard/billing",
        actionLabel: t("dashboard.overview.revenue.openBilling"),
      },
      {
        title: t("dashboard.overview.clientShell.title"),
        value: t("dashboard.overview.online"),
        caption: t("dashboard.overview.clientShell.caption"),
        icon: <Icon path={ICON_PATHS.health} />,
        visual: {
          kind: "status",
          items: [
            {
              label: t("dashboard.overview.clientShell.shellLoaded"),
              ok: true,
            },
            {
              label: t("dashboard.overview.clientShell.storesReady"),
              ok: true,
            },
          ],
        },
      },
      {
        title: t("dashboard.overview.growth.title"),
        value: t("dashboard.overview.emDash"),
        caption: t("dashboard.overview.growth.caption"),
        icon: <Icon path={ICON_PATHS.growth} />,
        href: "/dashboard/analytics",
        actionLabel: t("dashboard.overview.growth.openAnalytics"),
      },
    ],
    [
      activeCustomers,
      customers.items.length,
      locale,
      projectCount,
      t,
      todayActivity,
    ],
  );

  const cardVariants = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 8 },
        show: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: {
            ...framerTransition(MOTION_STANDARD_S),
            delay: Math.min(i * 0.04, 0.2),
          },
        }),
      };

  const workspaceName =
    organization?.name ?? t("dashboard.overview.fallbackName");

  return (
    <section
      aria-label={t("dashboard.overview.ariaLabel")}
      className="agx-dash-panel mb-10"
    >
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h2
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--agx-accent, #22d3ee)" }}
          >
            {t("dashboard.overview.title")}
          </h2>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("dashboard.overview.subtitle", { name: workspaceName })}
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
          {t("dashboard.activity.localBadge")}
        </span>
      </header>

      <div
        className={`grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3${ready ? " agx-dash-metrics-ready" : ""}`}
      >
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
