"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";
import { ConnectedAccounts } from "../../../features/business-agent";

const Page = dynamic(
  () =>
    import("../../../features/integrations").then(
      (mod) => mod.IntegrationCenter,
    ),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.integrations"),
  },
);

export default function RoutePage(): JSX.Element {
  return (
    <>
      <ConnectedAccounts />
      <Page />
    </>
  );
}
