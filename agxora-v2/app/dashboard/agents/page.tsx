"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () =>
    import("../../../features/agents").then(
      (mod) => mod.AgentOperatingSystem,
    ),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.agents"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
