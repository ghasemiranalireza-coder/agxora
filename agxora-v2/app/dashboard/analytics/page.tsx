"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () =>
    import("../../../features/intelligence").then(
      (mod) => mod.EnterpriseIntelligenceCenter,
    ),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading Intelligence Center…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
