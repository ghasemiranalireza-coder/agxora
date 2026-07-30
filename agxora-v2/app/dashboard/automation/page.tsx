"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { AutomationEnginePage } from "../../components/automation";

/**
 * AGXORA AI Workflow & Automation Engine.
 * Replaces the stub panel with the full enterprise foundation.
 * Does not alter Hero, Header, Sidebar chrome, Finance, CRM, or Creator Studio.
 */
export default function AutomationRoutePage(): JSX.Element {
  return (
    <AppShell>
      <AutomationEnginePage />
    </AppShell>
  );
}
