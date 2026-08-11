"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () =>
    import("../../../features/auth").then((mod) => mod.IamIdentityWorkspace),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.identity"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
