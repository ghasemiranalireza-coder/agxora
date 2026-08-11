"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () => import("../../components/finance").then((mod) => mod.FinancePage),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.finance"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
