"use client";

import type { JSX } from "react";
import { AISettingsPanel } from "../../components/AISettingsPanel";
import { DashboardSidebar } from "../../components/DashboardSidebar";
import ThemeSwitcher from "../../components/ThemeSwitcher";
import { THEME_TRANSITION_MS, useTheme } from "../../lib/theme";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

export default function DashboardSettingsPage(): JSX.Element {
  const { tokens } = useTheme();

  return (
    <main
      style={{
        minHeight: "100vh",
        color: tokens.text,
        display: "flex",
        flexWrap: "wrap",
        background: "transparent",
        transition: surfaceTransition,
        fontFamily:
          '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      <DashboardSidebar />
      <section
        style={{
          position: "relative",
          flex: 1,
          padding: "44px 48px 56px",
          minWidth: "320px",
          background: "transparent",
        }}
      >
        <div style={{ position: "absolute", top: 28, right: 32, zIndex: 5 }}>
          <ThemeSwitcher />
        </div>
        <AISettingsPanel />
      </section>
    </main>
  );
}
