"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";

export default function ProjectsPage(): JSX.Element {
  return (
    <AppShell>
      <ModulePanel
        title="Projects"
        description="Project delivery and tracking for the active organization."
      />
    </AppShell>
  );
}
