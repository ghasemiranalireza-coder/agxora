"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () => import("../../components/creator-studio").then((mod) => mod.CreatorStudioPage),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading creator studio…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
