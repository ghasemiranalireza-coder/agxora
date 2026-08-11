"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const TeamWorkspace = dynamic(
  () =>
    import("../../components/team/TeamWorkspace").then(
      (mod) => mod.TeamWorkspace,
    ),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.team"),
  },
);

export default function TeamPage(): JSX.Element {
  return <TeamWorkspace />;
}
