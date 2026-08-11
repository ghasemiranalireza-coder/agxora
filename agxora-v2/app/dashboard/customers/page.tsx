"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const CustomersWorkspace = dynamic(
  () =>
    import("../../components/customers").then((mod) => mod.CustomersWorkspace),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.customers"),
  },
);

export default function CustomersPage(): JSX.Element {
  return <CustomersWorkspace />;
}
