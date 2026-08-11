"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { createRouteLoading } from "../../components/dashboard/RouteLoadingPanel";

const ProjectsWorkspace = dynamic(
  () =>
    import("../../components/projects").then((mod) => mod.ProjectsWorkspace),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.projects"),
  },
);

export default function ProjectsPage(): JSX.Element {
  return <ProjectsWorkspace />;
}
