"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () => import("../../components/settings").then((mod) => mod.SettingsControlCenter),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading settings…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
