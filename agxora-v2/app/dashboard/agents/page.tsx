"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () =>
    import("../../../features/agents").then(
      (mod) => mod.AgentOperatingSystem,
    ),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading Agent OS…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
