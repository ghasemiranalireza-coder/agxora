"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () =>
    import("../../../features/automation").then(
      (mod) => mod.AutomationWorkspace,
    ),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.automation"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
