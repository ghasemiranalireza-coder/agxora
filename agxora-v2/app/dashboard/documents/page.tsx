"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () => import("../../components/documents").then((mod) => mod.DocumentsHubPage),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading documents…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
