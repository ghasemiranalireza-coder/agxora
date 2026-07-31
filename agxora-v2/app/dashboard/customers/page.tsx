"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { SkeletonPanel } from "../../components/backend";

const CustomersWorkspace = dynamic(
  () =>
    import("../../components/customers").then((mod) => mod.CustomersWorkspace),
  {
    ssr: false,
    loading: () => <SkeletonPanel label="Loading customers…" />,
  },
);

export default function CustomersPage(): JSX.Element {
  return (
    <AppShell>
      <CustomersWorkspace />
    </AppShell>
  );
}
