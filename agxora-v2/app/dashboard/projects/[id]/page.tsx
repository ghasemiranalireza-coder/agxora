"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import type { JSX } from "react";
import { SkeletonPanel } from "../../../components/backend";

const ProjectDetailWorkspace = dynamic(
  () =>
    import("../../../components/projects").then(
      (mod) => mod.ProjectDetailWorkspace,
    ),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading project…" />,
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
