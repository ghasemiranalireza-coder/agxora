"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () =>
    import("../../../features/auth").then((mod) => mod.IamIdentityWorkspace),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading identity…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
