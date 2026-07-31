"use client";

import type { JSX } from "react";
import { ModulePanel } from "../../components/ModulePanel";

export default function AnalyticsPage(): JSX.Element {
  return (
    <ModulePanel
      title="Analytics"
      description="Business intelligence and operational metrics."
    />
  );
}
