"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () => import("../../components/documents").then((mod) => mod.DocumentsHubPage),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.documents"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
