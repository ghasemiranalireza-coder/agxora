"use client";

import type { JSX } from "react";
import { ModulePanel } from "../../components/ModulePanel";

export default function MemoryPage(): JSX.Element {
  return (
    <ModulePanel
      title="Memory"
      description="Organization memory remains connected to chat and Business OS."
    />
  );
}
