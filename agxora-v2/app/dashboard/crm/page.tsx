"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const Page = dynamic(
  () => import("../../components/crm").then((mod) => mod.CrmPage),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading CRM…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}
