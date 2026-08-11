"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const CrmEnterpriseWorkspace = dynamic(
  () =>
    import("../../components/crm").then((mod) => mod.CrmEnterpriseWorkspace),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.crm"),
  },
);

export default function RoutePage(): JSX.Element {
  return <CrmEnterpriseWorkspace />;
}
