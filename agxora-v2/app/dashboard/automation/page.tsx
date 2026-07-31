"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () =>
    import("../../../features/automation").then(
      (mod) => mod.AutomationWorkspace,
    ),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading automation…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
