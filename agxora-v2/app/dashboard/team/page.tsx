"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const TeamWorkspace = dynamic(
  () =>
    import("../../components/team/TeamWorkspace").then(
      (mod) => mod.TeamWorkspace,
    ),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading team…" />,
  },
);

export default function TeamPage(): JSX.Element {
  return <TeamWorkspace />;
}
