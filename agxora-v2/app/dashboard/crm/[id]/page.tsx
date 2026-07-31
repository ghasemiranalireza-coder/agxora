"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import type { JSX } from "react";
import { SkeletonPanel } from "../../../components/backend";

const CrmCustomerProfileWorkspace = dynamic(
  () =>
    import("../../../components/crm").then(
      (mod) => mod.CrmCustomerProfileWorkspace,
    ),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading customer…" />,
  },
);

export default function CrmCustomerPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  return <CrmCustomerProfileWorkspace customerId={id} />;
}
