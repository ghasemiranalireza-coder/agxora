"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";
import ThemeSwitcher from "../../components/ThemeSwitcher";
import { useTheme } from "../../lib/theme";

export default function SettingsPage(): JSX.Element {
  const { tokens } = useTheme();
  return (
    <AppShell>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, right: 0, zIndex: 5 }}>
          <ThemeSwitcher />
        </div>
        <ModulePanel
          title="Settings"
          description="Workspace, organization, and AI preferences. Theme controls stay in the approved switcher."
        >
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: tokens.text,
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <li>Organization profile and slug</li>
            <li>Workspace isolation and modules</li>
            <li>Team roles and invitations</li>
            <li>AI provider settings (when configured)</li>
          </ul>
        </ModulePanel>
      </div>
    </AppShell>
  );
}
