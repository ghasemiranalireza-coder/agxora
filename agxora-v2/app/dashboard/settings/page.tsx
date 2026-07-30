"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { SettingsControlCenter } from "../../components/settings";

/**
 * Enterprise Settings Control Center.
 * Replaces the ModulePanel stub. Header keeps a theme quick toggle only;
 * full Appearance configuration lives in this page.
 */
export default function SettingsPage(): JSX.Element {
  return (
    <AppShell>
      <SettingsControlCenter />
    </AppShell>
  );
}
