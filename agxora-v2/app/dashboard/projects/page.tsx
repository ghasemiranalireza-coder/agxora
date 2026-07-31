"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const ProjectsWorkspace = dynamic(
  () =>
    import("../../components/projects").then((mod) => mod.ProjectsWorkspace),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading projects…" />,
  },
);

export default function ProjectsPage(): JSX.Element {
  return <ProjectsWorkspace />;
}
