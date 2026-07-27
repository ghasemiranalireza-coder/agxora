"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";

export default function MemoryPage(): JSX.Element {
  return (
    <AppShell>
      <ModulePanel
        title="Memory"
        description="Organization memory remains connected to chat and Business OS."
      />
    </AppShell>
  );
}
