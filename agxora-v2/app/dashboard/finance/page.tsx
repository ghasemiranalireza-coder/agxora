"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () => import("../../components/finance").then((mod) => mod.FinancePage),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading finance…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
