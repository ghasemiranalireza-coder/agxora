"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const Page = dynamic(
  () => import("../../components/creator-studio").then((mod) => mod.CreatorStudioPage),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.creator"),
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
