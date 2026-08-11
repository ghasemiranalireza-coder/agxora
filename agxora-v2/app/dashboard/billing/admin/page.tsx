"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () =>
    import("../../../../features/saas").then((mod) => mod.AdminBillingPanel),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.billingAdmin"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
