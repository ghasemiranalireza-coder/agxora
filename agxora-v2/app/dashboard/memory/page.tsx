"use client";

import type { JSX } from "react";
import { ModulePanel } from "../../components/ModulePanel";
import { EmptyState } from "../../components/ui";

export default function MemoryPage(): JSX.Element {
  return (
    <ModulePanel
      title="Memory"
      description="Organization memory is not connected in this build."
    >
      <EmptyState
        title="Memory workspace is not available yet"
        description="Persistent organization memory storage is not connected. Chat may keep short-lived context in-session only — nothing here is stored as enterprise memory."
      />
    </ModulePanel>
  );
}
