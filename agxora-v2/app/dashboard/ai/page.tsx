"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const AiPlatformWorkspace = dynamic(
  () =>
    import("../../../features/ai").then((mod) => mod.AiPlatformWorkspace),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading AI Platform…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <AiPlatformWorkspace />;
}
