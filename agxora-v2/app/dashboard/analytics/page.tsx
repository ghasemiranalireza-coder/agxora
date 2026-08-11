"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () =>
    import("../../../features/intelligence").then(
      (mod) => mod.EnterpriseIntelligenceCenter,
    ),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.analytics"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
