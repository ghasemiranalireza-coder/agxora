"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";

const CrmEnterpriseWorkspace = dynamic(
  () =>
    import("../../components/crm").then((mod) => mod.CrmEnterpriseWorkspace),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading CRM…" />,
  },
);

export default function RoutePage(): JSX.Element {
  return <CrmEnterpriseWorkspace />;
}
