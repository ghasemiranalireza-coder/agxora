"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import type { JSX } from "react";
import { createRouteLoading } from "../../../components/dashboard/RouteLoadingPanel";

const ProjectDetailWorkspace = dynamic(
  () =>
    import("../../../components/projects").then(
      (mod) => mod.ProjectDetailWorkspace,
    ),
  {
    ssr: false,
    loading: createRouteLoading("dashboard.routeLoading.project"),
  },
);

export default function ProjectDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);

  return <ProjectDetailWorkspace projectId={id} />;
}
