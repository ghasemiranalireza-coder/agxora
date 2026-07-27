"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";

export default function AutomationPage(): JSX.Element {
  return (
    <AppShell>
      <ModulePanel
        title="Automation"
        description="Workflows and automations for the active workspace."
      />
    </AppShell>
  );
}
