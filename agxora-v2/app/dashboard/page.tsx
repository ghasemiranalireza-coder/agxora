"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../components/backend";

const DashboardHome = dynamic(
  () =>
    import("../components/dashboard/DashboardHome").then(
      (m) => m.DashboardHome,
    ),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading dashboard…" />,
  },
);

/**
 * Dashboard home — heavy Hero / overview / chat are code-split.
 * Shell stays mounted via dashboard layout.
 */
export default function Dashboard(): JSX.Element {
  return <DashboardHome />;
}
