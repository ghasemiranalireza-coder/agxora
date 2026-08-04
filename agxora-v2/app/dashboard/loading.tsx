import type { JSX } from "react";
import { SkeletonPanel } from "../components/backend";

/** App Router loading UI — reduces layout shift on dashboard navigations. */
export default function DashboardLoading(): JSX.Element {
  return <SkeletonPanel label="Loading workspace…" />;
}
