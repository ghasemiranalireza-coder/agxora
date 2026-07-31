"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () => import("../../components/automation").then((mod) => mod.AutomationEnginePage),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading automation…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
