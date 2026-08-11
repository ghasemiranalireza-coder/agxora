"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../components/backend";
import { useT } from "../lib/i18n";

function DashboardLoadingFallback(): JSX.Element {
  const t = useT();
  return <SkeletonPanel label={t("dashboard.loading")} />;
}

const DashboardHome = dynamic(
  () =>
    import("../components/dashboard/DashboardHome").then(
      (m) => m.DashboardHome,
    ),
  {
    ssr: false,
    loading: () => <DashboardLoadingFallback />,
  },
);

/**
 * Dashboard home — heavy Hero / overview / chat are code-split.
 * Shell stays mounted via dashboard layout.
 */
export default function Dashboard(): JSX.Element {
  return <DashboardHome />;
}
