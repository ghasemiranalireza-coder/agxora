"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () =>
    import("../../../features/saas").then((mod) => mod.CustomerBillingPortal),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading billing…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
