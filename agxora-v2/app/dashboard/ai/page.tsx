"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const AiPlatformWorkspace = dynamic(
  () =>
    import("../../../features/ai").then((mod) => mod.AiPlatformWorkspace),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.ai"),
  },
);

export default function RoutePage(): JSX.Element {
  return <AiPlatformWorkspace />;
}
