"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";

export default function AnalyticsPage(): JSX.Element {
  return (
    <AppShell>
      <ModulePanel
        title="Analytics"
        description="Business intelligence and operational metrics."
      />
    </AppShell>
  );
}
